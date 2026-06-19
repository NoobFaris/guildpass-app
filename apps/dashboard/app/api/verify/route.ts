import { NextRequest, NextResponse } from "next/server";
import { handleApiError, apiResponse } from "@/lib/api-helpers";
import { getEnv } from "@/lib/env";
import { IntegrationClient, type VerificationResult } from "@guildpass/integration-client";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleApiError(async () => {
    const env = getEnv();
    const client = new IntegrationClient({
      baseUrl: env.GUILD_PASS_CORE_URL,
      apiKey: env.GUILD_PASS_CORE_API_KEY,
    });

    const body = await request.json();
    const { discordUserId, wallet } = body;

    if (!discordUserId || !wallet) {
      return NextResponse.json(
        { error: "Missing discordUserId or wallet" },
        { status: 400 }
      );
    }

    const result: VerificationResult = await client.verifyWallet(
      discordUserId,
      wallet
    );

    return apiResponse(result);
  });
}
