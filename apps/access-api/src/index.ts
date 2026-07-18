import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { PrismaClient } from "@prisma/client";
import { MembershipIndexer } from "./workers/indexer.js";
import { LeaderElectionService } from "./utils/leader-election.js";
import { type Address } from "viem";

const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || "3000", 10);

function parseContractAddresses(): Address[] {
  const rawMulti = process.env.MEMBERSHIP_CONTRACT_ADDRESSES;
  if (rawMulti && rawMulti.trim().length > 0) {
    return rawMulti.split(",").map((s) => s.trim()).filter(Boolean).map((s) => s as Address);
  }
  const legacy = process.env.MEMBERSHIP_CONTRACT_ADDRESS;
  if (legacy && legacy.trim().length > 0) return [legacy.trim() as Address];
  return [];
}

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const contractAddresses = parseContractAddresses();
  const confirmationDepth = parseInt(process.env.INDEXER_CONFIRMATION_DEPTH || "10", 10);
  const deepReorgDepth = parseInt(process.env.INDEXER_DEEP_REORG_DEPTH || "1000", 10);
  const startBlock = BigInt(process.env.INDEXER_START_BLOCK || "0");

  if (!rpcUrl || contractAddresses.length === 0) {
    console.error("Missing RPC_URL or membership contract address.");
    process.exit(1);
  }

  const leaderElectionEnabled = process.env.LEADER_ELECTION_ENABLED !== "false";
  const prisma = new PrismaClient();
  const indexer = new MembershipIndexer({
    rpcUrl,
    contractAddresses,
    confirmationDepth,
    deepReorgDepth,
    startBlock,
  }, prisma);

  // ... (Leader election and Health server code remains same as your original)
  
  await indexer.start();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});