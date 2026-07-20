/** Guild-scoped authorization model for the dashboard. */

import { DEFAULT_GUILD_ID } from "@/lib/mock-data";

export type Role = "owner" | "admin" | "moderator" | "readonly";

export type Permission =
  | "passes:read"
  | "passes:write"
  | "members:read"
  | "members:write"
  | "guilds:read"
  | "guilds:write"
  | "activity:read"
  | "settings:read"
  | "settings:write";

/**
 * A user's role assignments keyed by the guild they belong to. A missing key
 * is intentionally not a role: users have no access to guilds they do not
 * explicitly belong to.
 */
export type GuildRoles = Record<string, Role>;

export interface Session {
  userId: string;
  name: string;
  roles: GuildRoles;
  /** Guild selected by the current dashboard context. */
  activeGuildId: string;

  /** @deprecated Migration-only compatibility field. Do not authorize with it. */
  role?: Role;
  /** @deprecated Migration-only compatibility field. Do not authorize with it. */
  permissions?: Permission[];
}

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ["passes:read", "passes:write", "members:read", "members:write", "guilds:read", "guilds:write", "activity:read", "settings:read", "settings:write"],
  admin: ["passes:read", "passes:write", "members:read", "members:write", "guilds:read", "guilds:write", "activity:read", "settings:read", "settings:write"],
  moderator: ["passes:read", "members:read", "members:write", "guilds:read", "activity:read", "settings:read"],
  readonly: ["passes:read", "members:read", "guilds:read", "activity:read", "settings:read"],
};

function createMockSession(role: Role, userId: string, name: string): Session {
  return {
    userId,
    name,
    roles: { [DEFAULT_GUILD_ID]: role },
    activeGuildId: DEFAULT_GUILD_ID,
    // Retained temporarily for local integrations that only render the badge.
    role,
    permissions: [...ROLE_PERMISSIONS[role]],
  };
}

/** Single-guild mock sessions remain convenient for local development. */
export const MOCK_SESSIONS: Record<Role, Session> = {
  owner: createMockSession("owner", "mock-owner-001", "Owner Alice"),
  admin: createMockSession("admin", "mock-admin-001", "Admin Bob"),
  moderator: createMockSession("moderator", "mock-moderator-001", "Moderator Charlie"),
  readonly: createMockSession("readonly", "mock-readonly-001", "Viewer Diana"),
};

export const MOCK_ACTIVE_ROLE: Role = "readonly";
export const MOCK_SESSION: Session = MOCK_SESSIONS[MOCK_ACTIVE_ROLE];
export const MOCK_API_ROLE: Role = MOCK_ACTIVE_ROLE;
export const MOCK_API_SESSION: Session = MOCK_SESSIONS[MOCK_API_ROLE];
