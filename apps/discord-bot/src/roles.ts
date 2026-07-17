import type { GuildMember } from "discord.js";
import { config } from "./config.js";
import type { Membership } from "@guildpass/integration-client";
import {
  RoleReconciliationQueue,
  type QueueOptions,
} from "./queue.js";

export type RoleMap = Record<string, string>;

// ── Singleton queue ──────────────────────────────────────────────────────

let _queue: RoleReconciliationQueue | null = null;

/** Get or create the shared role-reconciliation queue. */
export function getReconciliationQueue(
  options?: QueueOptions,
): RoleReconciliationQueue {
  if (!_queue) {
    _queue = new RoleReconciliationQueue(options);
  }
  return _queue;
}

/** Replace the singleton (mainly for testing). */
export function setReconciliationQueue(q: RoleReconciliationQueue): void {
  _queue = q;
}

// ── Role resolution ──────────────────────────────────────────────────────

export function resolveDesiredRoles(m: Membership, map: RoleMap): string[] {
  const desired = new Set<string>();
  for (const r of m.roles) {
    const id = map[r];
    if (id) desired.add(id);
  }
  return Array.from(desired);
}

// ── Retry helpers ────────────────────────────────────────────────────────

export interface RetryOptions {
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxRetries: 3,
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  const status =
    typeof e.status === "number"
      ? e.status
      : typeof e.httpStatus === "number"
        ? e.httpStatus
        : null;
  // Retry on 429 (rate limit), 5xx (server errors), and network errors (no status).
  return status === 429 || (status !== null && status >= 500) || status === null;
}

/**
 * Retry an async operation with jittered exponential backoff.
 * Only retries on transient errors (429, 5xx, network).
 */
async function withRetry<T>(
  op: () => Promise<T>,
  label: string,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries, baseBackoffMs, maxBackoffMs } = {
    ...DEFAULT_RETRY,
    ...options,
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await op();
    } catch (err: unknown) {
      if (!isRetryable(err) || attempt >= maxRetries) {
        throw err;
      }

      // Respect Retry-After header on 429s.
      const retryAfterSec = extractRetryAfterSec(err);
      const delay = retryAfterSec
        ? retryAfterSec * 1000
        : Math.min(
            baseBackoffMs * Math.pow(2, attempt) + Math.random() * 1000,
            maxBackoffMs,
          );

      console.warn(
        `[roles] retry #${attempt + 1} for ${label} after ${Math.round(delay)}ms: ${String(err).slice(0, 200)}`,
      );
      await sleep(delay);
    }
  }

  // Unreachable — the loop either returns or throws.
  throw new Error("unreachable");
}

function extractRetryAfterSec(err: unknown): number {
  if (typeof err !== "object" || err === null) return 0;
  const e = err as Record<string, unknown>;
  if (typeof e.retryAfter === "number") return Math.ceil(e.retryAfter / 1000);
  const raw = e.rawError as Record<string, unknown> | undefined;
  if (raw?.retry_after && typeof raw.retry_after === "number")
    return raw.retry_after as number;
  return 0;
}

// ── Core reconciliation ──────────────────────────────────────────────────

/**
 * Reconcile a member's Discord roles to match the desired set.
 *
 * Only guild-managed roles (admin, member, contributor) are ever removed;
 * externally-assigned roles are left untouched.
 *
 * Each `roles.add` / `roles.remove` call is individually retried on transient
 * Discord API failures (429, 5xx, network errors).
 */
export async function reconcileMemberRoles(
  member: GuildMember,
  desiredRoleIds: string[],
): Promise<{ added: string[]; removed: string[] }> {
  const currentIds = member.roles.cache.map((r) => r.id);

  // Roles that are desired but missing.
  const toAdd = desiredRoleIds.filter((id) => !currentIds.includes(id));

  // Guild-managed roles that are present but no longer desired.
  const managedRoles = [
    config.roles.admin,
    config.roles.member,
    config.roles.contributor,
  ];
  const toRemove = currentIds.filter(
    (id) => managedRoles.includes(id) && !desiredRoleIds.includes(id),
  );

  if (toAdd.length > 0) {
    await withRetry(
      () => member.roles.add(toAdd),
      `roles.add(${toAdd.join(",")})`,
    );
  }

  if (toRemove.length > 0) {
    await withRetry(
      () => member.roles.remove(toRemove),
      `roles.remove(${toRemove.join(",")})`,
    );
  }

  return { added: toAdd, removed: toRemove };
}

/**
 * Queue-aware wrapper: enqueues the reconciliation via the shared queue
 * so that per-guild concurrency is bounded and rate-limit-aware.
 *
 * @param guildId - The Discord guild (server) ID for queuing isolation.
 * @param member - The GuildMember to reconcile.
 * @param desiredRoleIds - The target role set.
 */
export async function reconcileMemberRolesQueued(
  guildId: string,
  member: GuildMember,
  desiredRoleIds: string[],
  queueOptions?: QueueOptions,
): Promise<{ added: string[]; removed: string[] }> {
  const queue = getReconciliationQueue(queueOptions);
  return queue.enqueue(guildId, () =>
    reconcileMemberRoles(member, desiredRoleIds),
  );
}
