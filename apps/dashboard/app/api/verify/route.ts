import { NextRequest, NextResponse } from "next/server";
import { handleApiError, apiResponse } from "@/lib/api-helpers";
import { getEnv, getApiMode } from "@/lib/env";
import { IntegrationClient, type VerificationResult } from "@guildpass/integration-client";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleApiError(async () => {
    const mode = getApiMode();
    const body = await request.json();
    const { discordUserId, wallet } = body;

    if (!discordUserId || !wallet) {
      return NextResponse.json(
        { error: "Missing discordUserId or wallet" },
        { status: 400 }
      );
    }

    if (mode === "live") {
      const env = getEnv();
      // Allow injecting a test client via globalThis for unit tests
      const testClient = (globalThis as any).__TEST_INTEGRATION_CLIENT;
      const client =
        testClient ??
        new IntegrationClient({
          baseUrl: env.GUILD_PASS_CORE_URL as string,
          apiKey: env.GUILD_PASS_CORE_API_KEY,
        });

      const result: VerificationResult = await client.verifyWallet(
        discordUserId,
        wallet
      );

      return apiResponse(result);
    }

    // Mock verification result in mock mode
    const mock: VerificationResult = {
      userId: discordUserId,
      wallet,
      verified: true,
      message: "mock verification succeeded",
    };

    return apiResponse(mock);
  });
}
