import { config, validateConfig } from "./config.js";
import type { Membership, VerificationResult } from "@guildpass/integration-client";

// Check if we should use mock mode (if any config is a dummy value)
const isMockMode = (
  config.token.includes("dummy") || 
  config.clientId.includes("dummy") || 
  config.guildId.includes("dummy")
);

const missing = validateConfig();
if (missing.length > 0) {
  console.error("Missing config", missing.join(","));
  process.exit(1);
}

// Mock integration client for testing
class MockIntegrationClient {
  async verifyWallet(discordUserId: string, wallet: string): Promise<VerificationResult> {
    console.log("[mock] verifyWallet called", discordUserId, wallet);
    return {
      userId: discordUserId,
      wallet,
      verified: true,
      message: "Mock verification successful"
    };
  }
  
  async getMembershipByDiscordUser(discordUserId: string): Promise<Membership | null> {
    console.log("[mock] getMembershipByDiscordUser called", discordUserId);
    return {
      userId: discordUserId,
      wallet: "0x1234567890123456789012345678901234567890",
      status: "active",
      roles: ["member", "contributor"],
      updatedAt: new Date().toISOString()
    };
  }
  
  async getMembershipByWallet(wallet: string): Promise<Membership | null> {
    console.log("[mock] getMembershipByWallet called", wallet);
    return {
      userId: "1234567890",
      wallet,
      status: "active",
      roles: ["member"],
      updatedAt: new Date().toISOString()
    };
  }
}

const core = new MockIntegrationClient();

if (isMockMode) {
  console.log("[mock] Starting in mock mode (will not connect to Discord)");
  console.log("[mock] You can test the code logic without real credentials");
  console.log("[mock] Mock integration client ready!");
  process.exit(0); // Exit cleanly in mock mode
}
