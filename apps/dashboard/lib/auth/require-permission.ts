/**
 * lib/auth/require-permission.ts
 *
 * Centralizes the session-resolution + assertPermission try/catch that used
 * to be duplicated in every mutation route handler. Also hooks in audit
 * recording of denied attempts so it isn't duplicated per-route either.
 */

import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { requireDashboardSession, UnauthorizedError } from "./server-session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { recordDashboardActivity } from "@/lib/activity/dashboard";
import type { Permission, Session } from "./session";

export type PermissionGuardResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

/**
 * Asserts that `session` holds `permission`. On denial, records an
 * `activity.permission_denied` audit event and returns the 403 response to
 * send. Recording is fire-and-forget and swallows its own errors — an audit
 * write failure must never delay or fail the 403 response.
 */
export function guardPermission(
  session: Session,
  permission: Permission
): PermissionGuardResult {
  try {
    assertPermission(session, permission);
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      recordPermissionDenied(session, permission);
      return { ok: false, response: apiError(err.message, 403) };
    }
    throw err;
  }
  return { ok: true, session };
}

/**
 * Resolves the session from `request` and asserts `permission` — the common
 * case for API route handlers.
 *
 * @example
 * ```ts
 * const guard = requireSessionAndPermission(request, "passes:write");
 * if (!guard.ok) return guard.response;
 * const { session } = guard;
 * ```
 */
export function requireSessionAndPermission(
  request: Request,
  permission: Permission
): PermissionGuardResult {
  let session: Session;
  try {
    session = requireDashboardSession(request);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { ok: false, response: apiError(err.message, 401) };
    }
    throw err;
  }

  return guardPermission(session, permission);
}

function recordPermissionDenied(session: Session, permission: Permission): void {
  void recordDashboardActivity({
    type: "activity.permission_denied",
    severity: "warning",
    actor: { id: session.userId, name: session.name },
    description: `Permission denied: "${permission}" is required for this action.`,
    metadata: { permission, role: session.role },
  }).catch((err) => {
    console.error("Failed to record permission_denied activity event:", err);
  });
}
