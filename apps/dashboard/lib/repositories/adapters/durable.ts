/**
 * Durable repository adapters for production deployments.
 * Contract: implementations must be server-side only and not expose credentials.
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
import { prisma } from "../db";

/**
 * Base class for durable repositories.
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
 */
export class DurablePassRepository extends DurableRepository implements IPassRepository {
  async getAll(): Promise<Pass[]> {
    const records = await prisma.pass.findMany({ orderBy: { createdAt: "desc" } });
    return records.map((r) => ({ id: r.id, guildId: r.guildId, createdAt: r.createdAt.toISOString() }));
  }

  async query(options: PassListQuery = {}): Promise<PaginatedResult<Pass>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const skip = (page - 1) * limit;

    const [records, total] = await prisma.$transaction([
      prisma.pass.findMany({ skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.pass.count(),
    ]);

    return {
      items: records.map((r) => ({ id: r.id, guildId: r.guildId, createdAt: r.createdAt.toISOString() })),
      total,
      page,
      limit,
    };
  }

  async getById(id: string): Promise<Pass | null> {
    const record = await prisma.pass.findUnique({ where: { id } });
    if (!record) return null;
    return { id: record.id, guildId: record.guildId, createdAt: record.createdAt.toISOString() };
  }

  async create(pass: Omit<Pass, "id" | "createdAt">): Promise<Pass> {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.pass.create({ data: { guildId: pass.guildId } });
      const created: Pass = { id: record.id, guildId: record.guildId, createdAt: record.createdAt.toISOString() };
      
      await this.recordDiff(
        {} as any,
        created as any,
        "pass.created",
        `Created pass ${record.id}`,
        "pass",
        record.id
      );
      return created;
    });
  }

  async update(id: string, pass: Partial<Pass>): Promise<Pass | null> {
    return await prisma.$transaction(async (tx) => {
      const existingRecord = await tx.pass.findUnique({ where: { id } });
      if (!existingRecord) return null;

      const existing: Pass = { id: existingRecord.id, guildId: existingRecord.guildId, createdAt: existingRecord.createdAt.toISOString() };
      const record = await tx.pass.update({
        where: { id },
        data: { ...(pass.guildId ? { guildId: pass.guildId } : {}) },
      });

      const updated: Pass = { id: record.id, guildId: record.guildId, createdAt: record.createdAt.toISOString() };
      await this.recordDiff(existing as any, updated as any, "pass.updated", `Updated pass ${id}`, "pass", id);
      return updated;
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.pass.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Durable guild repository.
 */
export class DurableGuildRepository extends DurableRepository implements IGuildRepository {
  async getAll(): Promise<Guild[]> {
    const records = await prisma.guild.findMany({ orderBy: { createdAt: "desc" } });
    return records.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon ?? undefined,
      memberCount: r.memberCount,
      activePassesCount: r.activePassesCount,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getById(id: string): Promise<Guild | null> {
    const r = await prisma.guild.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      icon: r.icon ?? undefined,
      memberCount: r.memberCount,
      activePassesCount: r.activePassesCount,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async create(guild: Omit<Guild, "id" | "createdAt">): Promise<Guild> {
    const r = await prisma.guild.create({
      data: {
        name: guild.name,
        icon: guild.icon,
        memberCount: guild.memberCount,
        activePassesCount: guild.activePassesCount,
      },
    });
    return {
      id: r.id,
      name: r.name,
      icon: r.icon ?? undefined,
      memberCount: r.memberCount,
      activePassesCount: r.activePassesCount,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async update(id: string, guild: Partial<Guild>): Promise<Guild | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const r = await prisma.guild.update({
      where: { id },
      data: {
        ...(guild.name ? { name: guild.name } : {}),
        ...(guild.icon !== undefined ? { icon: guild.icon } : {}),
        ...(guild.memberCount !== undefined ? { memberCount: guild.memberCount } : {}),
        ...(guild.activePassesCount !== undefined ? { activePassesCount: guild.activePassesCount } : {}),
      },
    });

    const updated: Guild = {
      id: r.id,
      name: r.name,
      icon: r.icon ?? undefined,
      memberCount: r.memberCount,
      activePassesCount: r.activePassesCount,
      createdAt: r.createdAt.toISOString(),
    };

    await this.recordDiff(existing as any, updated as any, "guild.updated", `Updated guild ${id}`, "guild", id, r.name);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.guild.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Durable member repository.
 */
export class DurableMemberRepository extends DurableRepository implements IMemberRepository {
  async getAll(): Promise<Member[]> {
    const records = await prisma.member.findMany({ orderBy: { joinedAt: "desc" } });
    return records.map((r) => ({
      id: r.id,
      guildId: r.guildId,
      wallet: r.wallet,
      roles: r.roles as string[],
      status: r.status as "active" | "inactive",
      joinedAt: r.joinedAt.toISOString(),
    }));
  }

  async query(options: MemberListQuery = {}): Promise<PaginatedResult<Member>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      ...(options.guildId ? { guildId: options.guildId } : {}),
      ...(options.search ? { wallet: { contains: options.search } } : {}),
    };

    const [records, total] = await prisma.$transaction([
      prisma.member.findMany({ where, skip, take: limit, orderBy: { joinedAt: "desc" } }),
      prisma.member.count({ where }),
    ]);

    return {
      items: records.map((r) => ({
        id: r.id,
        guildId: r.guildId,
        wallet: r.wallet,
        roles: r.roles as string[],
        status: r.status as "active" | "inactive",
        joinedAt: r.joinedAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getById(id: string): Promise<Member | null> {
    const r = await prisma.member.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id,
      guildId: r.guildId,
      wallet: r.wallet,
      roles: r.roles as string[],
      status: r.status as "active" | "inactive",
      joinedAt: r.joinedAt.toISOString(),
    };
  }

  async getByWallet(wallet: string): Promise<Member | null> {
    const r = await prisma.member.findFirst({ where: { wallet } });
    if (!r) return null;
    return {
      id: r.id,
      guildId: r.guildId,
      wallet: r.wallet,
      roles: r.roles as string[],
      status: r.status as "active" | "inactive",
      joinedAt: r.joinedAt.toISOString(),
    };
  }

  async create(member: Omit<Member, "id">): Promise<Member> {
    return await prisma.$transaction(async (tx) => {
      const r = await tx.member.create({
        data: {
          guildId: member.guildId,
          wallet: member.wallet,
          roles: member.roles,
          status: member.status,
          joinedAt: new Date(member.joinedAt),
        },
      });

      const created: Member = {
        id: r.id,
        guildId: r.guildId,
        wallet: r.wallet,
        roles: r.roles as string[],
        status: r.status as "active" | "inactive",
        joinedAt: r.joinedAt.toISOString(),
      };

      await this.recordDiff({} as any, created as any, "member.joined", `Member joined ${r.id}`, "member", r.id);
      return created;
    });
  }

  async update(id: string, member: Partial<Member>): Promise<Member | null> {
    return await prisma.$transaction(async (tx) => {
      const existingRecord = await tx.member.findUnique({ where: { id } });
      if (!existingRecord) return null;

      const existing: Member = {
        id: existingRecord.id,
        guildId: existingRecord.guildId,
        wallet: existingRecord.wallet,
        roles: existingRecord.roles as string[],
        status: existingRecord.status as "active" | "inactive",
        joinedAt: existingRecord.joinedAt.toISOString(),
      };

      const r = await tx.member.update({
        where: { id },
        data: {
          ...(member.roles ? { roles: member.roles } : {}),
          ...(member.status ? { status: member.status } : {}),
        },
      });

      const updated: Member = {
        id: r.id,
        guildId: r.guildId,
        wallet: r.wallet,
        roles: r.roles as string[],
        status: r.status as "active" | "inactive",
        joinedAt: r.joinedAt.toISOString(),
      };

      const eventType = member.roles ? "member.roles_changed" : "member.left";
      await this.recordDiff(existing as any, updated as any, eventType, `Updated member ${id}`, "member", id);
      return updated;
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.member.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Durable activity repository.
 */
export class DurableActivityRepository extends DurableRepository implements IActivityRepository {
  async append(event: Omit<ActivityEvent, "id" | "timestamp"> & Partial<Pick<ActivityEvent, "schemaVersion">>): Promise<ActivityEvent> {
    const record = await prisma.activityEvent.create({
      data: {
        eventType: event.type,
        data: event as any,
      },
    });

    return {
      id: record.id,
      timestamp: record.createdAt.toISOString(),
      ...event,
    } as ActivityEvent;
  }

  async query(options?: { limit?: number; type?: ActivityEvent["type"]; since?: string }): Promise<ActivityEvent[]> {
    const records = await prisma.activityEvent.findMany({
      where: {
        ...(options?.type ? { eventType: options.type } : {}),
        ...(options?.since ? { createdAt: { gte: new Date(options.since) } } : {}),
      },
      take: options?.limit ?? 50,
      orderBy: { createdAt: "desc" },
    });

    return records.map((r) => ({
      id: r.id,
      timestamp: r.createdAt.toISOString(),
      ...(r.data as any),
    }));
  }

  async hasProcessed(eventId: string): Promise<boolean> {
    const count = await prisma.activityEvent.count({
      where: { id: eventId },
    });
    return count > 0;
  }

  async markProcessed(_eventId: string): Promise<boolean> {
    return true;
  }
}

/**
 * Durable settings repository.
 */
export class DurableSettingsRepository extends DurableRepository implements ISettingsRepository {
  async get(): Promise<DashboardSettings> {
    const r = await prisma.workspaceSettings.findFirst();
    if (!r) {
      return {
        workspaceId: "default",
        theme: "dark",
        features: { verification: true, webhooks: true, analytics: true },
      };
    }
    return r.data as unknown as DashboardSettings;
  }

  async update(patch: Partial<DashboardSettings>): Promise<DashboardSettings> {
    const current = await this.get();
    const updated = { ...current, ...patch, features: { ...current.features, ...patch.features } };

    await prisma.workspaceSettings.upsert({
      where: { id: "settings_singleton" },
      create: { id: "settings_singleton", data: updated as any },
      update: { data: updated as any },
    });

    await this.recordDiff(current as any, updated as any, "guild.updated", "Updated workspace settings", "guild", "settings");
    return updated;
  }
}