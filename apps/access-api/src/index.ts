import "dotenv/config";
import { MembershipIndexer } from "./workers/indexer.js";
import { type Address } from "viem";

function parseContractAddresses(): Address[] {
  const rawMulti = process.env.MEMBERSHIP_CONTRACT_ADDRESSES;
  if (rawMulti && rawMulti.trim().length > 0) {
    return rawMulti
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s as Address);
  }

  const legacy = process.env.MEMBERSHIP_CONTRACT_ADDRESS;
  if (legacy && legacy.trim().length > 0) return [legacy.trim() as Address];

  return [];
}

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const contractAddresses = parseContractAddresses();
  const confirmationDepth = parseInt(process.env.INDEXER_CONFIRMATION_DEPTH || "10", 10);
  const startBlock = BigInt(process.env.INDEXER_START_BLOCK || "0");

  if (!rpcUrl || contractAddresses.length === 0) {
    console.error(
      "Missing RPC_URL or membership contract address. Provide either MEMBERSHIP_CONTRACT_ADDRESSES (comma-separated) or MEMBERSHIP_CONTRACT_ADDRESS."
    );
    process.exit(1);
  }

  const indexer = new MembershipIndexer({
    rpcUrl,
    contractAddresses,
    confirmationDepth,
    startBlock,
  });

  await indexer.start();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

