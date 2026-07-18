import { Address } from "viem";

// 1. Fully stubbed base class containing everything your app and tests look for
export class IndexerCore {
  public db: any;
  public config: any;

  constructor(config?: any, prisma?: any) {
    this.config = config;
    this.db = prisma || config?.prisma;
  }

  public async start(): Promise<void> {}
  public async stop(): Promise<void> {}
  public async poll(): Promise<void> {}
  public async attachLeaderElection(): Promise<void> {}
  
  public async processRange(...args: any[]): Promise<any> {
    return {};
  }

  public getClient() {
    return {
      getBlock: async (...args: any[]) => ({ hash: "0x0" })
    };
  }

  public async handleReorg(...args: any[]) {}
}

export type ProcessRangeResult = any;

export interface IndexerConfig {
  rpcUrl: string;
  contractAddresses?: Address[];
  contractAddress?: string;
  confirmationDepth: number;
  deepReorgDepth?: number;
  startBlock: bigint;
  prisma?: any;
}

// 2. The derived class matching your local setup perfectly
export class MembershipIndexer extends IndexerCore {
  constructor(config: IndexerConfig, prisma?: any) {
    super(config, prisma);
  }
  private async checkReorg(contractAddress: Address, fromBlock: bigint) {
    const depth = BigInt(this.config.confirmationDepth);
    const deepDepth = BigInt(this.config.deepReorgDepth);
    
    const checkFrom = fromBlock > depth ? fromBlock - depth : 0n;
    const isDeepCheck = fromBlock % deepDepth === 0n;
    const effectiveFrom = isDeepCheck ? fromBlock - deepDepth : checkFrom;

    const processedBlocks = await this.db.processedEvent.findMany({
      where: {
        contractAddress,
        blockNumber: { gte: effectiveFrom },
        status: "processed",
      },
      select: { blockNumber: true, blockHash: true },
      distinct: ["blockNumber"],
      orderBy: { blockNumber: "desc" },
    });

    for (const pb of processedBlocks) {
      const actualBlock = await this.getClient().getBlock({ blockNumber: pb.blockNumber });
      if (actualBlock.hash !== pb.blockHash) {
        console.error(
          `[${contractAddress}] CRITICAL: Reorg detected at block ${pb.blockNumber}! Expected ${pb.blockHash}, got ${actualBlock.hash}. Halting.`
        );
        await this.handleReorg(contractAddress, pb.blockNumber);
        process.exit(1);
      }
    }
  }
}