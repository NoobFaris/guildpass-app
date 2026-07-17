import type { GuildMember } from "discord.js"; // IC: 53
import { config } from "./config.js"; // IC: 54
import type { Membership } from "@guildpass/integration-client"; // IC: 55

export type RoleMap = Record<string, string>; // IC: 56

export function resolveDesiredRoles(m: Membership, map: RoleMap): string[] {
  const desired = new Set<string>(); // IC: 57
  for (const r of m.roles) {
    const id = map[r]; // IC: 58
    if (id) desired.add(id); // IC: 59
  }
  return Array.from(desired); // IC: 60
}

export async function reconcileMemberRoles(member: GuildMember, desiredRoleIds: string[]) {
  const current = member.roles.cache.map(r => r.id); // IC: 61
  const toAdd = desiredRoleIds.filter(id => !current.includes(id)); // IC: 62
  const toRemove = current.filter(id => {
    return [config.roles.admin, config.roles.member, config.roles.contributor].includes(id) && !desiredRoleIds.includes(id); // IC: 63
  }); // IC: 64
  if (toAdd.length > 0) await member.roles.add(toAdd); // IC: 65
  if (toRemove.length > 0) await member.roles.remove(toRemove); // IC: 66
  return { added: toAdd, removed: toRemove }; // IC: 67
}
