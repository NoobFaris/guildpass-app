import {
  createPublicClient,
  http,
  decodeEventLog,
  type Address,
  type PublicClient,
  type Log
} from "viem";
import { mainnet } from "viem/chains";
import { PrismaClient } from "@prisma/client";
import { MEMBERSHIP_ABI, MEMBERSHIP_EVENTS } from "@guildpass/contracts";

export interface IndexerConfig {
  rpcUrl: string;
  contractAddress: Address;
  confirmationDepth: number;
  startBlock: bigint;
}

// ─── Types shared between the live indexer and the backfill CLI ───────────────

/** Lightweight summary of one applied event, used by dry-run mode. */
export interface ProcessedLogSummary {
  transactionHash: string;
  logIndex: number;
  blockNumber: bigint;
  blockHash: string;
  eventType: string;
  args: Record<string, unknown>;
  /** Whether the record already exists (idempotent re-application). */
  alreadyProcessed: boolean;
}

/** Options passed to the shared processRange() method. */
export interface ProcessRangeOptions {
  fromBlock: bigint;
  toBlock: bigint;
  /**
   * When true, the method collects and returns what would change without
   * writing anything to the database.
   */
  dryRun?: boolean;
}

/** Result returned by processRange(). */
export interface ProcessRangeResult {
  fromBlock: bigint;
  toBlock: bigint;
  logsFound: number;
  logsApplied: number;
  logsSkipped: number;
  dryRun: boolean;
  /** Populated only in dry-run mode – one entry per log that would be applied. */
  preview: ProcessedLogSummary[];
}

// ─── Core: reusable processing engine ─────────────────────────────────────────

/**
 * IndexerCore owns the stateless event-processing logic so it can be called
 * by both the continuous live indexer (poll loop) and the one-shot backfill CLI.
 *
 * It deliberately does NOT touch IndexerCheckpoint — callers decide what
 * checkpoint semantics they need.
 *
 * The PrismaClient is injected rather than created at module scope so tests
 * can provide a mock without requiring a real database connection.
 */
export class IndexerCore {
  private client: PublicClient;
  protected config: IndexerConfig;
  protected db: PrismaClient;

  constructor(config: IndexerConfig, db?: PrismaClient) {
    this.config = config;
    // Lazily initialise Prisma only when no mock is injected
    this.db = db ?? new PrismaClient();
    this.client = createPublicClient({
      chain: mainnet,
      transport: http(config.rpcUrl),
    });
  }

  /** Expose the viem client so subclasses / callers can reuse it. */
  getClient(): PublicClient {
    return this.client;
  }

  /**
   * Fetch and process (or preview) all logs in [fromBlock, toBlock].
   *
   * When dryRun=true no database writes are performed; instead a preview
   * array is returned with what would have been written.
   */
  async processRange(opts: ProcessRangeOptions): Promise<ProcessRangeResult> {
    const { fromBlock, toBlock, dryRun = false } = opts;

    const logs = await this.getClient().getLogs({
      address: this.config.contractAddress,
      fromBlock,
      toBlock,
    });

    const result: ProcessRangeResult = {
      fromBlock,
      toBlock,
      logsFound: logs.length,
      logsApplied: 0,
      logsSkipped: 0,
      dryRun,
      preview: [],
    };

    for (const log of logs) {
      if (dryRun) {
        const summary = await this.previewLog(log);
        if (summary) {
          result.preview.push(summary);
          if (!summary.alreadyProcessed) result.logsApplied++;
          else result.logsSkipped++;
        }
      } else {
        const applied = await this.processLog(log);
        if (applied) result.logsApplied++;
        else result.logsSkipped++;
      }
    }

    return result;
  }

  /**
   * Dry-run version of processLog: decodes and returns a summary without
   * writing to the database.
   */
  private async previewLog(log: Log): Promise<ProcessedLogSummary | null> {
    const { transactionHash, logIndex, blockHash, blockNumber } = log;
    if (!transactionHash || logIndex === null || !blockHash || blockNumber === null) {
      return null;
    }

    try {
      const decoded = decodeEventLog({
        abi: MEMBERSHIP_ABI,
        data: log.data,
        topics: log.topics,
      });

      const existing = await this.db.processedEvent.findUnique({
        where: { transactionHash_logIndex: { transactionHash, logIndex } },
      });

      const alreadyProcessed =
        existing?.status === "processed" && existing.blockHash === blockHash;

      return {
        transactionHash,
        logIndex,
        blockNumber,
        blockHash,
        eventType: decoded.eventName,
        args: decoded.args as Record<string, unknown>,
        alreadyProcessed,
      };
    } catch {
      return null;
    }
  }

  /**
   * Process a single log: decode, apply membership state, and record
   * in ProcessedEvent (idempotent upsert).
   *
   * Returns true if the log was applied; false if it was skipped (duplicate).
   */
  async processLog(log: Log): Promise<boolean> {
    const { transactionHash, logIndex, blockHash, blockNumber } = log;
    if (!transactionHash || logIndex === null || !blockHash || blockNumber === null) {
      return false;
    }

    const existing = await this.db.processedEvent.findUnique({
      where: { transactionHash_logIndex: { transactionHash, logIndex } },
    });

    if (existing) {
      if (existing.status === "processed" && existing.blockHash === blockHash) {
        console.log(`Skipping duplicate log: ${transactionHash}-${logIndex}`);
        return false;
      }

      if (existing.blockHash !== blockHash) {
        console.warn(`Reorg detected via log mismatch at ${transactionHash}`);
        await this.handleReorg(blockNumber);
        throw new Error("REORG_DETECTED"); // Abort current batch
      }

      // If status was "reverted", we proceed to re-process it below
    }

    try {
      const decoded = decodeEventLog({
        abi: MEMBERSHIP_ABI,
        data: log.data,
        topics: log.topics,
      });

      await this.db.$transaction(async (tx) => {
        await this.applyEventApplication(decoded, log, tx);

        await tx.processedEvent.upsert({
          where: { transactionHash_logIndex: { transactionHash, logIndex } },
          update: {
            blockHash,
            blockNumber,
            status: "processed",
            eventType: decoded.eventName,
            data: decoded.args as any,
          },
          create: {
            blockHash,
            blockNumber,
            transactionHash,
            logIndex,
            status: "processed",
            eventType: decoded.eventName,
            data: decoded.args as any,
          },
        });
      });

      return true;
    } catch (err) {
      if ((err as Error).message === "REORG_DETECTED") throw err;
      console.error(`Failed to process log ${transactionHash}-${logIndex}:`, err);
      return false;
    }
  }

  async applyEventApplication(decoded: any, log: Log, tx: any) {
    const { eventName, args } = decoded;
    console.log(`Applying ${eventName} for ${args.member}`);

    if (eventName === MEMBERSHIP_EVENTS.MembershipCreated) {
      await tx.membership.upsert({
        where: { wallet_passId: { wallet: args.member, passId: args.passId } },
        update: { status: 1 }, // Active
        create: { wallet: args.member, passId: args.passId, status: 1 },
      });
    } else if (eventName === MEMBERSHIP_EVENTS.MembershipUpdated) {
      await tx.membership.update({
        where: { wallet_passId: { wallet: args.member, passId: args.passId } },
        data: { status: args.newStatus },
      });
    }
  }

  async revertEventApplication(event: any, tx: any) {
    console.log(`Reverting ${event.eventType} for ${event.transactionHash}`);
    const data = event.data as any;

    if (event.eventType === MEMBERSHIP_EVENTS.MembershipCreated) {
      await tx.membership.delete({
        where: { wallet_passId: { wallet: data.member, passId: BigInt(data.passId) } }
      }).catch(() => {});
    } else if (event.eventType === MEMBERSHIP_EVENTS.MembershipUpdated) {
      await tx.membership.update({
        where: { wallet_passId: { wallet: data.member, passId: BigInt(data.passId) } },
        data: { status: 0 },
      }).catch(() => {});
    }
  }

  async handleReorg(reorgBlockNumber: bigint) {
    const safeBlock = reorgBlockNumber - 1n;
    console.log(`Rolling back to safe block ${safeBlock}`);

    const eventsToRevert = await this.db.processedEvent.findMany({
      where: {
        blockNumber: { gte: reorgBlockNumber },
        status: "processed"
      },
      orderBy: { blockNumber: "desc" }
    });

    await this.db.$transaction(async (tx) => {
      for (const event of eventsToRevert) {
        await this.revertEventApplication(event, tx);
      }

      await tx.processedEvent.updateMany({
        where: { blockNumber: { gte: reorgBlockNumber } },
        data: { status: "reverted" },
      });

      await tx.indexerCheckpoint.upsert({
        where: { id: "singleton" },
        update: { lastBlock: safeBlock },
        create: { id: "singleton", lastBlock: safeBlock },
      });
    });
  }
}

// ─── Live indexer: owns the poll loop and checkpoint ──────────────────────────

/**
 * MembershipIndexer wraps IndexerCore with the continuous polling loop and
 * IndexerCheckpoint management for live production use.
 */
export class MembershipIndexer extends IndexerCore {
  async start() {
    console.log("Starting indexer...");
    while (true) {
      try {
        await this.poll();
      } catch (error) {
        console.error("Indexer error:", error);
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  async poll() {
    const lastCheckpoint = await this.db.indexerCheckpoint.findUnique({
      where: { id: "singleton" },
    });

    const currentBlock = await this.getClient().getBlockNumber();

    // Only process up to (tip - confirmationDepth) to ensure finality
    const safeTip = currentBlock - BigInt(this.config.confirmationDepth);

    let fromBlock = lastCheckpoint
      ? lastCheckpoint.lastBlock + 1n
      : this.config.startBlock;

    // Detect and handle reorgs before moving forward
    await this.checkReorg(fromBlock);

    // Refresh fromBlock in case checkReorg triggered a rollback
    const updatedCheckpoint = await this.db.indexerCheckpoint.findUnique({
      where: { id: "singleton" },
    });
    fromBlock = updatedCheckpoint
      ? updatedCheckpoint.lastBlock + 1n
      : this.config.startBlock;

    if (fromBlock > safeTip) {
      return;
    }

    const toBlock = safeTip;
    console.log(`Indexing from ${fromBlock} to ${toBlock}`);

    await this.processRange({ fromBlock, toBlock, dryRun: false });

    await this.db.indexerCheckpoint.upsert({
      where: { id: "singleton" },
      update: { lastBlock: toBlock },
      create: { id: "singleton", lastBlock: toBlock },
    });
  }

  private async checkReorg(fromBlock: bigint) {
    const depth = BigInt(this.config.confirmationDepth);
    const checkFrom = fromBlock > depth ? fromBlock - depth : 0n;

    const processedBlocks = await this.db.processedEvent.findMany({
      where: {
        blockNumber: { gte: checkFrom },
        status: "processed",
      },
      select: { blockNumber: true, blockHash: true },
      distinct: ["blockNumber"],
      orderBy: { blockNumber: "desc" },
    });

    for (const pb of processedBlocks) {
      const actualBlock = await this.getClient().getBlock({ blockNumber: pb.blockNumber });

      if (actualBlock.hash !== pb.blockHash) {
        console.warn(
          `Reorg detected at block ${pb.blockNumber}! Expected ${pb.blockHash}, got ${actualBlock.hash}`
        );
        await this.handleReorg(pb.blockNumber);
        return;
      }
    }
  }
}
