/**
 * lib/permissions.ts
 *
 * Pure permission helper functions used by both client components (UI gating)
 * and server-side API route handlers (mutation enforcement).
 *
 * Design principles:
 *  - All logic lives here; no inline `session.permissions.includes(...)` spread
 *    around the codebase.
 *  - Named helpers (canManagePasses, etc.) are the public API — import these.
 *  - `assertPermission` is the server-side guard; it throws PermissionDeniedError
 *    which API routes catch and convert to a 403 response.
 *
 * ⚠️  UI hiding is a UX convenience only. Real security depends on backend
 *     enforcement via assertPermission in every mutation route handler.
 */

import type { Session, Permission } from "@/lib/auth/session";

// ── Core check ────────────────────────────────────────────────────────────────

/**
 * Returns true if the session holds the requested permission.
 * This is the single primitive all other helpers delegate to.
 */
export function hasPermission(session: Session, permission: Permission): boolean {
  return session.permissions.includes(permission);
}

// ── Named helpers (UI gating) ─────────────────────────────────────────────────

/** Can the user create, edit, or delete passes? */
export const canManagePasses = (session: Session): boolean =>
  hasPermission(session, "passes:write");

/** Can the user invite, remove, or change roles of members? */
export const canManageMembers = (session: Session): boolean =>
  hasPermission(session, "members:write");

/** Can the user edit guild metadata (name, description, etc.)? */
export const canManageGuilds = (session: Session): boolean =>
  hasPermission(session, "guilds:write");

/** Can the user save changes on the Settings page? */
export const canEditSettings = (session: Session): boolean =>
  hasPermission(session, "settings:write");

// ── Server-side assertion (API route guard) ───────────────────────────────────

/**
 * Custom error thrown by assertPermission.
 * API routes should catch this and return a 403 response.
 */
export class PermissionDeniedError extends Error {
  readonly permission: Permission;
  readonly statusCode = 403;
  /** Marks this as a client-safe error so handleApiError exposes its message. */
  readonly expose = true as const;

  constructor(permission: Permission) {
    super(`Permission denied: "${permission}" is required for this action.`);
    this.name = "PermissionDeniedError";
    this.permission = permission;
  }
}

/**
 * Throws PermissionDeniedError if the session does not hold `permission`.
 *
 * Usage in an API route handler:
 * ```ts
 * assertPermission(MOCK_SESSION, "passes:write");
 * ```
 *
 * In production, pair this with a real session resolved from the request
 * headers / JWT / cookie before calling assertPermission.
 */
export function assertPermission(session: Session, permission: Permission): void {
  if (!hasPermission(session, permission)) {
    throw new PermissionDeniedError(permission);
  }
}
