import { NextResponse } from "next/server";
import { handleApiError, apiError } from "@/lib/api-helpers";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";

/**
 * GET /api/settings is intentionally omitted — settings are rendered server-side
 * from the session; no separate read endpoint is needed for this page.
 *
 * PATCH /api/settings
 * Requires settings:write permission.
 *
 * ⚠️  In production, resolve the session from the request (JWT / cookie)
 *     instead of using MOCK_API_SESSION, then assertPermission against it.
 */
export async function PATCH(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "settings:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: parse request body and persist settings to the real data store
    return { message: "Settings updated (stub)" };
  });
}
