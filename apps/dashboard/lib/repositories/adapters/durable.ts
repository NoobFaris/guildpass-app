/**
 * Durable repository adapters for production deployments.
 * Contract: implementations must be server-side only and not expose credentials.
 * 
 * NOTE: Specific backend choice (PostgreSQL, MongoDB, etc.) is implementation-specific.
 * This file provides the interface and placeholder for future backend adapters.
 */

import type {
  IPassRepository,
  IGuildRepository,
  IMemberRepository,
  IActivityRepository,
  ISettingsRepository,
  MemberListQuery,
  PaginatedResult,
  PassListQuery,
} from "../types";
import type { Pass, Guild, Member } from "../../mock-data";
import type { ActivityEvent } from "@/lib/activity/types";
import type { DashboardSettings } from "../../settings";
import { computeDiff } from "@/lib/activity/diff";

/**
 * Base class for durable repositories.
 * Implementations should handle connection pooling, retries, and error handling.
 */
abstract class DurableRepository {
  protected connectionString: string;
  protected activityRepo?: IActivityRepository;

  constructor(connectionString: string, activityRepo?: IActivityRepository) {
    this.connectionString = connectionString;
    this.activityRepo = activityRepo;
    this.validateConnection();
  }

  protected validateConnection(): void {
    if (!this.connectionString) {
      throw new Error("Database connection string is not configured");
    }
  }

  /**
   * Compute and record a field-level audit diff after a mutation.
   * Subclasses should call this within the same transaction as the write.
   *
   * @param previous Pre-mutation entity state
   * @param next     Post-mutation entity state
   * @param type     Activity event type to emit
   * @param description Human-readable description
   * @param entityType  Entity discriminator for the activity record
   * @param entityId    Entity identifier
   * @param entityName  Optional display name
   */
  protected async recordDiff<T extends Record<string, unknown>>(
    previous: T,
    next: T,
    type: ActivityEvent["type"],
    description: string,
    entityType: "pass" | "guild" | "member",
    entityId: string,
    entityName?: string,
  ): Promise<void> {
    if (!this.activityRepo) return;
    const changes = computeDiff(previous, next);
    if (changes.length === 0) return;
    await this.activityRepo.append({
      type,
      source: "dashboard",
      severity: "info",
      actor: { name: "Admin" },
      description,
      entity: { type: entityType, id: entityId, name: entityName },
      changes,
    });
  }
}

/**
 * Durable pass repository.
 * 
 * Backend implementations MUST:
 * - Store connection credentials securely (environment variables only)
 * - Never log sensitive data
 * - Return 404 for missing records, not errors
 * - Handle concurrent writes gracefully
 */
export class DurablePassRepository extends DurableRepository implements IPassRepository {
  async getAll(): Promise<Pass[]> {
    // TODO: Implement against selected backend
    throw new Error("DurablePassRepository not yet implemented. Configure STORAGE_BACKEND in .env");
  }

  async query(_options: PassListQuery = {}): Promise<PaginatedResult<Pass>> {
    // Durable backends should push search/filter/pagination into indexed queries.
    throw new Error("DurablePassRepository not yet implemented. Configure STORAGE_BACKEND in .env");
  }

  async getById(_id: string): Promise<Pass | null> {
    throw new Error("DurablePassRepository not yet implemented");
  }

  async create(_pass: Omit<Pass, "id" | "createdAt">): Promise<Pass> {
    // TODO: Implement with transaction support:
    // 1. INSERT into passes table
    // 2. Call this.recordDiff({}, created, "pass.created", desc, "pass", id, name)
    throw new Error("DurablePassRepository not yet implemented");
  }

  async update(_id: string, _pass: Partial<Pass>): Promise<Pass | null> {
    // TODO: Implement with optimistic locking or version column:
    // 1. SELECT ... FOR UPDATE (or equivalent)
    // 2. Call this.recordDiff(existing, updated, "pass.updated", desc, "pass", id, name)
    // 3. UPDATE
    throw new Error("DurablePassRepository not yet implemented");
  }

  async delete(_id: string): Promise<boolean> {
    // TODO: Implement soft-delete pattern for audit trail
    throw new Error("DurablePassRepository not yet implemented");
  }
}

/**
 * Durable guild repository.
 * 
 * Backend implementations MUST maintain guild settings durability
 * and support atomic updates to member/pass counts.
 */
export class DurableGuildRepository extends DurableRepository implements IGuildRepository {
  async getAll(): Promise<Guild[]> {
    throw new Error("DurableGuildRepository not yet implemented");
  }

  async getById(_id: string): Promise<Guild | null> {
    throw new Error("DurableGuildRepository not yet implemented");
  }

  async create(_guild: Omit<Guild, "id" | "createdAt">): Promise<Guild> {
    throw new Error("DurableGuildRepository not yet implemented");
  }

  async update(_id: string, _guild: Partial<Guild>): Promise<Guild | null> {
    throw new Error("DurableGuildRepository not yet implemented");
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error("DurableGuildRepository not yet implemented");
  }
}

/**
 * Durable member repository.
 * 
 * Backend implementations MUST:
 * - Maintain wallet uniqueness constraint
 * - Support efficient lookups by wallet for verification flows
 * - Track member status changes for audit purposes
 */
export class DurableMemberRepository extends DurableRepository implements IMemberRepository {
  async getAll(): Promise<Member[]> {
    throw new Error("DurableMemberRepository not yet implemented");
  }

  async query(_options: MemberListQuery = {}): Promise<PaginatedResult<Member>> {
    // Durable backends should push search/filter/pagination into indexed queries.
    throw new Error("DurableMemberRepository not yet implemented");
  }

  async getById(_id: string): Promise<Member | null> {
    throw new Error("DurableMemberRepository not yet implemented");
  }

  async getByWallet(_wallet: string): Promise<Member | null> {
    // High-traffic operation; should be indexed
    throw new Error("DurableMemberRepository not yet implemented");
  }

  async create(_member: Omit<Member, "id">): Promise<Member> {
    // TODO: Within transaction — INSERT, then this.recordDiff({}, created, "member.joined", desc, "member", id, name)
    throw new Error("DurableMemberRepository not yet implemented");
  }

  async update(_id: string, _member: Partial<Member>): Promise<Member | null> {
    // TODO: Within transaction — SELECT FOR UPDATE, compute diff via
    // this.recordDiff(existing, updated, eventType, desc, "member", id, name),
    // then UPDATE. Use member.roles_changed when roles differ, otherwise member.left.
    throw new Error("DurableMemberRepository not yet implemented");
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error("DurableMemberRepository not yet implemented");
  }
}

/**
 * Durable activity repository.
 * 
 * Backend implementations MUST:
 * - Use append-only pattern for audit integrity
 * - Guarantee idempotency via event ID uniqueness constraint
 * - Support efficient queries by type and timestamp
 * - Keep raw JSON metadata for future schema evolution
 */
export class DurableActivityRepository extends DurableRepository implements IActivityRepository {
  async append(_event: Omit<ActivityEvent, "id" | "timestamp"> & Partial<Pick<ActivityEvent, "schemaVersion">>): Promise<ActivityEvent> {
    throw new Error("DurableActivityRepository not yet implemented");
  }

  async query(_options?: {
    limit?: number;
    type?: ActivityEvent["type"];
    since?: string;
  }): Promise<ActivityEvent[]> {
    throw new Error("DurableActivityRepository not yet implemented");
  }

  async hasProcessed(_eventId: string): Promise<boolean> {
    throw new Error("DurableActivityRepository not yet implemented");
  }

  async markProcessed(_eventId: string): Promise<boolean> {
    throw new Error("DurableActivityRepository not yet implemented");
  }
}

/**
 * Durable settings repository.
 *
 * Backend implementations MUST:
 * - Persist the single settings document per workspace
 * - Never store secret values in this public settings model
 */
export class DurableSettingsRepository extends DurableRepository implements ISettingsRepository {
  async get(): Promise<DashboardSettings> {
    throw new Error("DurableSettingsRepository not yet implemented. Configure STORAGE_BACKEND in .env");
  }

  async update(_patch: Partial<DashboardSettings>): Promise<DashboardSettings> {
    // TODO: Within transaction — read current, apply patch, call
    // this.recordDiff(previous, updated, "guild.updated", desc, "guild", "settings", name),
    // then write back.
    throw new Error("DurableSettingsRepository not yet implemented");
  }
}
