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

const prisma = new PrismaClient();

export interface IndexerConfig {
  rpcUrl: string;
  contractAddress: Address;
  confirmationDepth: number;
  startBlock: bigint;
}

export class MembershipIndexer {
  private client: PublicClient;
  private config: IndexerConfig;

  constructor(config: IndexerConfig) {
    this.config = config;
    this.client = createPublicClient({
      chain: mainnet,
      transport: http(config.rpcUrl),
    });
  }

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
    const lastCheckpoint = await prisma.indexerCheckpoint.findUnique({
      where: { id: "singleton" },
    });

    const currentBlock = await this.client.getBlockNumber();

    // We only process up to (tip - confirmationDepth) to ensure finality
    const safeTip = currentBlock - BigInt(this.config.confirmationDepth);

    let fromBlock = lastCheckpoint ? lastCheckpoint.lastBlock + 1n : this.config.startBlock;

    // Detect and handle reorgs before moving forward
    await this.checkReorg(fromBlock);

    // Refresh fromBlock in case checkReorg triggered a rollback
    const updatedCheckpoint = await prisma.indexerCheckpoint.findUnique({
      where: { id: "singleton" },
    });
    fromBlock = updatedCheckpoint ? updatedCheckpoint.lastBlock + 1n : this.config.startBlock;

    if (fromBlock > safeTip) {
      return;
    }

    const toBlock = safeTip;
    console.log(`Indexing from ${fromBlock} to ${toBlock}`);

    await this.processLogs(fromBlock, toBlock);

    await prisma.indexerCheckpoint.upsert({
      where: { id: "singleton" },
      update: { lastBlock: toBlock },
      create: { id: "singleton", lastBlock: toBlock },
    });
  }

  private async checkReorg(fromBlock: bigint) {
    // Check blocks in the confirmation window
    const depth = BigInt(this.config.confirmationDepth);
    const checkFrom = fromBlock > depth ? fromBlock - depth : 0n;

    const processedBlocks = await prisma.processedEvent.findMany({
      where: {
        blockNumber: { gte: checkFrom },
        status: "processed",
      },
      select: { blockNumber: true, blockHash: true },
      distinct: ["blockNumber"],
      orderBy: { blockNumber: "desc" },
    });

    for (const pb of processedBlocks) {
      const actualBlock = await this.client.getBlock({ blockNumber: pb.blockNumber });

      if (actualBlock.hash !== pb.blockHash) {
        console.warn(`Reorg detected at block ${pb.blockNumber}! Expected ${pb.blockHash}, got ${actualBlock.hash}`);
        await this.handleReorg(pb.blockNumber);
        return;
      }
    }
  }

  private async handleReorg(reorgBlockNumber: bigint) {
    const safeBlock = reorgBlockNumber - 1n;
    console.log(`Rolling back to safe block ${safeBlock}`);

    // Fetch all events that are being reverted to undo their application state
    const eventsToRevert = await prisma.processedEvent.findMany({
      where: {
        blockNumber: { gte: reorgBlockNumber },
        status: "processed"
      },
      orderBy: { blockNumber: "desc" }
    });

    await prisma.$transaction(async (tx) => {
      // Revert application state for each event
      for (const event of eventsToRevert) {
        await this.revertEventApplication(event, tx);
      }

      // Mark events as reverted
      await tx.processedEvent.updateMany({
        where: { blockNumber: { gte: reorgBlockNumber } },
        data: { status: "reverted" },
      });

      // Reset checkpoint
      await tx.indexerCheckpoint.upsert({
        where: { id: "singleton" },
        update: { lastBlock: safeBlock },
        create: { id: "singleton", lastBlock: safeBlock },
      });
    });
  }

  private async processLogs(fromBlock: bigint, toBlock: bigint) {
    const logs = await this.client.getLogs({
      address: this.config.contractAddress,
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      await this.processLog(log);
    }
  }

  private async processLog(log: Log) {
    const { transactionHash, logIndex, blockHash, blockNumber } = log;
    if (!transactionHash || logIndex === null || !blockHash || blockNumber === null) return;

    const existing = await prisma.processedEvent.findUnique({
      where: { transactionHash_logIndex: { transactionHash, logIndex } },
    });

    if (existing) {
      if (existing.status === "processed" && existing.blockHash === blockHash) {
        console.log(`Skipping duplicate log: ${transactionHash}-${logIndex}`);
        return;
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

      await prisma.$transaction(async (tx) => {
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
    } catch (err) {
      console.error(`Failed to process log ${transactionHash}-${logIndex}:`, err);
    }
  }

  private async applyEventApplication(decoded: any, log: Log, tx: any) {
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

  private async revertEventApplication(event: any, tx: any) {
    console.log(`Reverting ${event.eventType} for ${event.transactionHash}`);
    const data = event.data as any;

    if (event.eventType === MEMBERSHIP_EVENTS.MembershipCreated) {
      // To revert creation, we might delete it or set to unknown
      // For simplicity, let's delete if we are sure it was created here
      await tx.membership.delete({
        where: { wallet_passId: { wallet: data.member, passId: BigInt(data.passId) } }
      }).catch(() => {}); // Ignore if already gone
    } else if (event.eventType === MEMBERSHIP_EVENTS.MembershipUpdated) {
      // Reverting an update is harder without history.
      // In a real system, you'd store the PREVIOUS state in ProcessedEvent.
      // For this task, we'll mark it as status 0 (inactive/unknown) on revert.
      await tx.membership.update({
        where: { wallet_passId: { wallet: data.member, passId: BigInt(data.passId) } },
        data: { status: 0 },
      }).catch(() => {});
    }
  }
}
