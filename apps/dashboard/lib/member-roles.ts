/**
 * lib/member-roles.ts
 *
 * Allowed *member-record* roles and the pure helpers used to edit a member's
 * role list. These are intentionally separate from the dashboard access-control
 * roles (owner / admin / moderator / readonly in lib/auth/session.ts), which
 * govern what a *session* may do. A member record's roles are descriptive
 * labels on the membership itself — see issue #74's note.
 *
 * The helpers are pure so both the UI (RoleEditor) and the API route validation
 * share one source of truth and can be unit-tested without a DOM.
 */

export const MEMBER_ROLES = [
  "admin",
  "member",
  "contributor",
  "moderator",
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Type guard: is `value` one of the supported member roles? */
export function isMemberRole(value: unknown): value is MemberRole {
  return (
    typeof value === "string" &&
    (MEMBER_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Add a role to a member's role list. No-ops on an unsupported role or a
 * duplicate, so the result is always a valid, de-duplicated list.
 */
export function addRole(roles: string[], role: string): string[] {
  if (!isMemberRole(role) || roles.includes(role)) return roles;
  return [...roles, role];
}

/** Remove a role from a member's role list (no-op if absent). */
export function removeRole(roles: string[], role: string): string[] {
  return roles.filter((r) => r !== role);
}

export type RolesValidationResult =
  | { ok: true; roles: MemberRole[] }
  | { ok: false; invalid: string[] };

/**
 * Authoritative validation used by the API route before persisting. Ensures the
 * input is an array of supported roles, returns the de-duplicated list, or the
 * list of unsupported values so the caller can return a 400.
 */
export function validateRoles(input: unknown): RolesValidationResult {
  if (!Array.isArray(input)) {
    return { ok: false, invalid: ["roles must be an array"] };
  }

  const invalid = input.filter((r) => !isMemberRole(r)).map((r) => String(r));
  if (invalid.length > 0) {
    return { ok: false, invalid };
  }

  const deduped = Array.from(new Set(input as MemberRole[]));
  return { ok: true, roles: deduped };
}
