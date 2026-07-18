"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@/lib/auth/session";
import { useOptionalGuild } from "@/lib/guild/GuildProvider";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Passes", href: "/passes", icon: "🎫" },
  { name: "Guilds", href: "/guilds", icon: "🏰" },
  { name: "Members", href: "/members", icon: "👥" },
  { name: "Activity", href: "/activity", icon: "📋" },
  { name: "Integrations", href: "/integrations", icon: "🔌" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

/** Human-readable label + colour for each role, shown in the sidebar badge. */
const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  owner: { label: "Owner", className: "bg-amber-500 text-white" },
  admin: { label: "Admin", className: "bg-violet-600 text-white" },
  moderator: { label: "Moderator", className: "bg-sky-600 text-white" },
  readonly: { label: "Read-only", className: "bg-slate-500 text-white" },
};

export default function Sidebar({ session }: { session?: Session }) {
  const pathname = usePathname();
  const router = useRouter();
  const guildCtx = useOptionalGuild();
  const badge = session ? ROLE_BADGE[session.role] : null;

  const handleGuildChange = (nextId: string) => {
    if (!guildCtx || nextId === guildCtx.guildId) return;
    guildCtx.setGuildId(nextId);

    // If we're on a guild-scoped route, keep the same path under the new guild.
    const match = pathname?.match(/^\/guilds\/([^/]+)(\/.*)?$/);
    if (match) {
      const rest = match[2] ?? "";
      router.push(`/guilds/${nextId}${rest}`);
      return;
    }
    // Otherwise stay on the current page; data hooks re-fetch via guildId deps.
  };

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>🛡️</span> GuildPass
        </h1>
      </div>

      {/* ── Guild (tenant) switcher ───────────────────────────────────────── */}
      {guildCtx && (
        <div className="px-4 pt-4 pb-2 border-b border-slate-800">
          <label
            htmlFor="guild-switcher"
            className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2"
          >
            Active guild
          </label>
          <select
            id="guild-switcher"
            value={guildCtx.guildId}
            onChange={(e) => handleGuildChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            aria-label="Select guild"
          >
            {guildCtx.guilds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <Link
            href={`/guilds/${guildCtx.guildId}`}
            className="mt-2 inline-block text-xs text-slate-400 hover:text-primary-300 transition-colors"
          >
            Open guild overview →
          </Link>
        </div>
      )}

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-slate-800 text-primary-300 font-medium"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Role badge ── shown when a session is present ────────────────── */}
      {badge && session && (
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-2 truncate" title={session.name}>
            {session.name}
          </p>
          <span
            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
      )}
    </div>
  );
}
