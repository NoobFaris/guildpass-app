import "dotenv/config";
import { MembershipIndexer } from "./workers/indexer.js";
import { type Address } from "viem";

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.MEMBERSHIP_CONTRACT_ADDRESS as Address;
  const confirmationDepth = parseInt(process.env.INDEXER_CONFIRMATION_DEPTH || "10", 10);
  const startBlock = BigInt(process.env.INDEXER_START_BLOCK || "0");

  if (!rpcUrl || !contractAddress) {
    console.error("Missing RPC_URL or MEMBERSHIP_CONTRACT_ADDRESS");
    process.exit(1);
  }

  const indexer = new MembershipIndexer({
    rpcUrl,
    contractAddress,
    confirmationDepth,
    startBlock,
  });

  await indexer.start();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
