import { NextResponse } from "next/server";
import { handleApiError, apiError } from "@/lib/api-helpers";
import { mockMembers, type Member } from "@/lib/mock-data";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { IntegrationClient } from "@guildpass/integration-client";
import { getEnv, getApiMode } from "@/lib/env";

/**
 * GET /api/members
 * Accessible to all authenticated roles (members:read).
 */
export async function GET(request: Request): Promise<NextResponse> {
  return handleApiError(async () => {
    const mode = getApiMode();

    // Allow live lookups by query: ?wallet=0x.. or ?discordUserId=123
    const url = new URL(request.url);
    const wallet = url.searchParams.get("wallet");
    const discordUserId = url.searchParams.get("discordUserId");

    if (mode === "live") {
      const env = getEnv();
      // Allow injecting a test client via globalThis to avoid making real HTTP calls in tests
      const testClient = (globalThis as any).__TEST_INTEGRATION_CLIENT;
      const client =
        testClient ??
        new IntegrationClient({
          baseUrl: env.GUILD_PASS_CORE_URL as string,
          apiKey: env.GUILD_PASS_CORE_API_KEY,
        });

      try {
        if (wallet) {
          const m = await client.getMembershipByWallet(wallet);
          if (!m) return NextResponse.json([], { status: 200 });
          const mapped: Member = {
            id: m.userId,
            wallet: m.wallet ?? "",
            name: m.userId,
            status: m.status === "unknown" ? "pending" : m.status,
            roles: m.roles ?? [],
            joinedAt: m.updatedAt,
            lastActive: m.updatedAt,
          };
          return NextResponse.json([mapped]);
        }

        if (discordUserId) {
          const m = await client.getMembershipByDiscordUser(discordUserId);
          if (!m) return NextResponse.json([], { status: 200 });
          const mapped: Member = {
            id: m.userId,
            wallet: m.wallet ?? "",
            name: m.userId,
            status: m.status === "unknown" ? "pending" : m.status,
            roles: m.roles ?? [],
            joinedAt: m.updatedAt,
            lastActive: m.updatedAt,
          };
          return NextResponse.json([mapped]);
        }

        // We don't support listing all members via the core API here.
        return apiError("Live mode requires a lookup (wallet or discordUserId)", 501);
      } catch (err) {
        console.error("Error fetching membership in live mode:", err);
        return apiError("Failed to retrieve membership from core", 502);
      }
    }

    // Default: mock mode — return local mock members
    try {
      return NextResponse.json(mockMembers as Member[]);
    } catch (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json(mockMembers as Member[]);
    }
  });
}

/**
 * POST /api/members
 * Requires members:write permission (invite / create a member).
 *
 * ⚠️  In production, resolve the session from the request (JWT / cookie)
 *     instead of using MOCK_SESSION, then assertPermission against it.
 */
export async function POST(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "members:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: implement member invitation / creation logic
    return { message: "Member invited (stub)" };
  });
}

/**
 * DELETE /api/members
 * Requires members:write permission (remove a member).
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "members:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: implement member removal logic
    return { message: "Member removed (stub)" };
  });
}
