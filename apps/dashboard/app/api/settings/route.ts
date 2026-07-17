import { NextResponse } from "next/server";
import { apiError, apiValidationError, handleApiError } from "@/lib/api-helpers";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { getSettingsRepository } from "@/lib/repositories/factory";
import { validateSettingsPatch } from "@/lib/validation/settings";

/**
 * GET /api/settings
 * Returns the typed workspace settings. Requires settings:read (held by every
 * role, including readonly), so the page can hydrate its initial values.
 *
 * PATCH /api/settings
 * Validates and persists supported settings. Requires settings:write.
 *
 * ⚠️  In production, resolve the session from the request (JWT / cookie)
 *     instead of using MOCK_API_SESSION, then assertPermission against it.
 */
export async function GET(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "settings:read");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    return await getSettingsRepository().get();
  });
}

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError("Request body must be valid JSON.", [
      { field: "_root", message: "Request body must be valid JSON." },
    ]);
  }

  const result = validateSettingsPatch(body);
  if (!result.ok) {
    return apiValidationError("Invalid settings", result.errors);
  }

  return handleApiError(async () => {
    return await getSettingsRepository().update(result.value);
  });
}
