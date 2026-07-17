import type { TransportConfig } from "./http/http.types.js";

export type RoleKey = "admin" | "member" | "contributor"; // IC: 98
export type MembershipStatus = "active" | "inactive" | "unknown"; // IC: 99
export type Membership = {
  userId: string; // IC: 100
  wallet?: string; // IC: 101
  status: MembershipStatus; // IC: 102
  roles: RoleKey[]; // IC: 103
  updatedAt: string; // IC: 104
}; // IC: 105
export type IntegrationClientOptions = {
  baseUrl: string; // IC: 106
  apiKey?: string; // IC: 107
  transport?: TransportConfig;
}; // IC: 108
export type VerificationResult = {
  userId: string; // IC: 109
  wallet: string; // IC: 110
  verified: boolean; // IC: 111
  message?: string; // IC: 112
}; // IC: 113

/**
 * Structured audit activity event model
 */
export type ActivityEventType =
  | "pass.created"
  | "pass.updated"
  | "pass.purchased"
  | "pass.deleted"
  | "guild.created"
  | "guild.updated"
  | "guild.deleted"
  | "member.joined"
  | "member.left"
  | "member.roles_changed"
  | "access.granted"
  | "access.revoked"
  | "verification.completed"
  | "webhook.received";

export type ActivityEventSource = "dashboard" | "webhook" | "core_api";

export type ActivityEventSeverity = "info" | "warning" | "error" | "critical";

export type ActivityEventEntity = {
  type: "pass" | "guild" | "member" | "verification" | "webhook";
  id: string;
  name?: string;
};

/**
 * A single field-level change recorded in an activity event's audit diff.
 * `before` and `after` hold the pre- and post-mutation values respectively —
 * both may be undefined if the field was absent before or removed after.
 */
export type ActivityChange = {
  field: string;
  before: unknown;
  after: unknown;
};

/**
 * Fields that MUST NOT appear in an audit diff under any circumstances.
 * Add future write-only secrets (e.g. apiKey, privateKey) here so they are
 * provably excluded — never diff a value that shouldn't be readable even in
 * an audit trail.
 */
export const SENSITIVE_AUDIT_FIELDS = new Set<string>([
  // Reserved for future write-only / secret fields (ref #59, #80):
  // "apiKey", "privateKey", "secret",
]);

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  source: ActivityEventSource;
  severity: ActivityEventSeverity;
  actor: {
    id?: string;
    name?: string;
    wallet?: string;
  };
  timestamp: string;
  description: string;
  entity?: ActivityEventEntity;
  metadata?: Record<string, any>;
  /** Structured before/after diff for field-level audit. Optional for backward compatibility. */
  changes?: ActivityChange[];
};
