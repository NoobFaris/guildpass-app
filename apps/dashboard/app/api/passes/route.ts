import { NextResponse } from "next/server";
import { handleApiError, apiError } from "@/lib/api-helpers";
import { mockPasses, type Pass } from "@/lib/mock-data";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { getApiMode } from "@/lib/env";

/**
 * GET /api/passes
 * Accessible to all authenticated roles (passes:read).
 */
export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    const mode = getApiMode();

    if (mode === "live") {
      // IntegrationClient currently does not expose pass listing.
      return apiError("Pass listing in live mode is not implemented", 501);
    }

    try {
      return mockPasses as Pass[];
    } catch (error) {
      console.error("Error fetching passes:", error);
      return mockPasses as Pass[];
    }
  });
}

/**
 * POST /api/passes
 * Requires passes:write permission.
 *
 * ⚠️  In production, resolve the session from the request (JWT / cookie)
 *     instead of using MOCK_SESSION, then assertPermission against it.
 */
export async function POST(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: implement pass creation logic
    return { message: "Pass created (stub)" };
  });
}

/**
 * DELETE /api/passes
 * Requires passes:write permission.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: implement pass deletion logic
    return { message: "Pass deleted (stub)" };
  });
}
