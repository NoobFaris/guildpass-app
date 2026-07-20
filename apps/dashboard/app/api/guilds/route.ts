import { NextResponse } from "next/server";
import { handleApiError, apiError } from "@/lib/api-helpers";
import { mockGuilds, type Guild } from "@/lib/mock-data";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { assertCsrfToken, CsrfError } from "@/lib/auth/csrf";
import { getApiMode } from "@/lib/env";
import { getGuildRepository } from "@/lib/repositories/factory";

/**
 * GET /api/guilds
 * Accessible to all authenticated roles (guilds:read).
 * Fetches from the configured repository (mock or durable).
 */
export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    const apiMode = getApiMode();

    if (apiMode === "live") {
      // IntegrationClient doesn't provide guild listing; require implementation in future
      return apiError("Guild listing in live mode is not implemented", 501);
    }

    try {
      const guildRepository = getGuildRepository();
      return await guildRepository.getAll();
    } catch (error) {
      console.error("Error fetching guilds:", error);
      // Fallback to mock data on error
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
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertCsrfToken(request);
  } catch (err) {
    if (err instanceof CsrfError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  try {
    assertPermission(MOCK_API_SESSION, "guilds:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: implement guild request: Request): Promise<NextResponse> {
  try {
    assertCsrfToken(request);
  } catch (err) {
    if (err instanceof CsrfError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

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
