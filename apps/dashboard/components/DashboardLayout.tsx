import Sidebar from "./Sidebar";
import Header from "./Header";
import type { Session } from "@/lib/auth/session";
import { GuildRouteSync } from "@/lib/guild/GuildRouteSync";

/**
 * DashboardLayout wraps every dashboard page with the shared Sidebar + Header.
 * Guild (tenant) context lives at the root layout; this layout only syncs a
 * route-level guild id when provided.
 */
export default function DashboardLayout({
  title,
  children,
  session,
  initialGuildId,
  subtitle,
}: {
  title: string;
  children: React.ReactNode;
  /** Active user session — forwarded to the Sidebar for role display. */
  session?: Session;
  /** Route-level guild id when under /guilds/[guildId]/… */
  initialGuildId?: string;
  /** Optional subtitle shown under the page title (e.g. active guild name). */
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen flex">
      {initialGuildId ? <GuildRouteSync guildId={initialGuildId} /> : null}
      <Sidebar session={session} />
      <div className="flex-1 ml-64">
        <Header title={title} subtitle={subtitle} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
