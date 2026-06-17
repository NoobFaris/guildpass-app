"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import LastUpdated from "@/components/LastUpdated";
import { useActivityFeed } from "@/lib/hooks/useActivityFeed";
import { mockPasses, mockGuilds, mockMembers } from "@/lib/mock-data";

const totalPasses   = mockPasses.length;
const activeGuilds  = mockGuilds.length;
const activeMembers = mockMembers.filter((m) => m.status === "active").length;

export default function DashboardPage() {
  const { events, lastUpdated } = useActivityFeed({ limit: 5 });

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Passes"    value={totalPasses}   icon="🎫" trend="+2 this week" />
        <StatCard title="Active Guilds"   value={activeGuilds}  icon="🏰" trend="+1 this week" />
        <StatCard title="Active Members"  value={activeMembers} icon="👥" trend="+12 this week" />
        <StatCard title="Total Activity"  value={events.length} icon="📋" trend="live" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Live recent activity ────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Recent Activity</h2>
            <LastUpdated date={lastUpdated} />
          </div>
          <ul className="space-y-4">
            {events.slice(0, 5).map((activity) => (
              <li
                key={activity.id}
                className="flex items-start gap-4 border-b border-slate-100 pb-3 last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 truncate">{activity.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Recent passes (static) ──────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Recent Passes</h2>
          <ul className="space-y-3">
            {mockPasses.slice(0, 4).map((pass) => (
              <li key={pass.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">{pass.name}</p>
                  <p className="text-sm text-slate-500">{pass.currentSupply} / {pass.maxSupply ?? "∞"}</p>
                </div>
                <StatusBadge status={pass.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
