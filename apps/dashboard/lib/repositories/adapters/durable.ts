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
} from "../types";
import type { Pass, Guild, Member } from "../../mock-data";
import type { ActivityEvent } from "@/lib/activity/types";
import type { DashboardSettings } from "../../settings";

/**
 * Base class for durable repositories.
 * Implementations should handle connection pooling, retries, and error handling.
 */
abstract class DurableRepository {
  protected connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.validateConnection();
  }

  protected validateConnection(): void {
    if (!this.connectionString) {
      throw new Error("Database connection string is not configured");
    }
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
    // Example pseudocode:
    // const result = await db.query("SELECT * FROM passes ORDER BY created_at DESC");
    // return result.rows.map(row => this.mapRowToPass(row));
    throw new Error("DurablePassRepository not yet implemented. Configure STORAGE_BACKEND in .env");
  }

  async getById(_id: string): Promise<Pass | null> {
    // TODO: Implement
    throw new Error("DurablePassRepository not yet implemented");
  }

  async create(_pass: Omit<Pass, "id" | "createdAt">): Promise<Pass> {
    // TODO: Implement with transaction support
    throw new Error("DurablePassRepository not yet implemented");
  }

  async update(_id: string, _pass: Partial<Pass>): Promise<Pass | null> {
    // TODO: Implement with optimistic locking or version column
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

  async getById(_id: string): Promise<Member | null> {
    throw new Error("DurableMemberRepository not yet implemented");
  }

  async getByWallet(_wallet: string): Promise<Member | null> {
    // High-traffic operation; should be indexed
    throw new Error("DurableMemberRepository not yet implemented");
  }

  async create(_member: Omit<Member, "id">): Promise<Member> {
    throw new Error("DurableMemberRepository not yet implemented");
  }

  async update(_id: string, _member: Partial<Member>): Promise<Member | null> {
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
  async append(_event: Omit<ActivityEvent, "id" | "timestamp">): Promise<ActivityEvent> {
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
    throw new Error("DurableSettingsRepository not yet implemented");
  }
}
