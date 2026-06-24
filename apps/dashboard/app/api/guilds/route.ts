import { NextResponse } from "next/server";
import { handleApiError, apiError } from "@/lib/api-helpers";
import { mockGuilds, type Guild } from "@/lib/mock-data";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { getApiMode } from "@/lib/env";

/**
 * GET /api/guilds
 * Accessible to all authenticated roles (guilds:read).
 */
export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    const mode = getApiMode();

    if (mode === "live") {
      // IntegrationClient doesn't provide guild listing; require implementation in future
      return apiError("Guild listing in live mode is not implemented", 501);
    }

    try {
      return mockGuilds as Guild[];
    } catch (error) {
      console.error("Error fetching guilds:", error);
      return mockGuilds as Guild[];
    }
  });
}

/**
 * POST /api/guilds
 * Requires guilds:write permission (create a guild).
 *
 * ⚠️  In production, resolve the session from the request (JWT / cookie)
 *     instead of using MOCK_SESSION, then assertPermission against it.
 */
export async function POST(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "guilds:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: implement guild creation logic
    return { message: "Guild created (stub)" };
  });
}

/**
 * DELETE /api/guilds
 * Requires guilds:write permission (remove a guild).
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "guilds:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: implement guild deletion logic
    return { message: "Guild deleted (stub)" };
  });
}
