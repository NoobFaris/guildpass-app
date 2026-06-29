import { NextResponse } from "next/server";
import { handleApiError, apiError } from "@/lib/api-helpers";
import { requireDashboardSession, UnauthorizedError } from "@/lib/auth/server-session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";

/**
 * GET /api/settings is intentionally omitted — settings are rendered server-side
 * from the session; no separate read endpoint is needed for this page.
 *
 * PATCH /api/settings
 * Requires settings:write permission.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = requireDashboardSession(request);
    assertPermission(session, "settings:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    if (err instanceof UnauthorizedError) {
      return apiError(err.message, 401);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: parse request body and persist settings to the real data store
    return { message: "Settings updated (stub)" };
  });
}
