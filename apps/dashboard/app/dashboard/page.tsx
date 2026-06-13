import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { mockPasses, mockGuilds, mockMembers, mockActivity } from "@/lib/mock-data";
import StatusBadge from "@/components/StatusBadge";

export default function DashboardPage() {
  const totalPasses = mockPasses.length;
  const activeGuilds = mockGuilds.length;
  const totalMembers = mockMembers.reduce((sum, g) => sum + (g.status === "active" ? 1 : 0), 0);

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Passes" value={totalPasses} icon="🎫" trend="+2 this week" />
        <StatCard title="Active Guilds" value={activeGuilds} icon="🏰" trend="+1 this week" />
        <StatCard title="Active Members" value={totalMembers} icon="👥" trend="+12 this week" />
        <StatCard title="Total Activity" value={mockActivity.length} icon="📋" trend="+5 today" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Recent Activity</h2>
          <ul className="space-y-4">
            {mockActivity.slice(0, 5).map((activity) => (
              <li key={activity.id} className="flex items-start gap-4 border-b border-slate-100 pb-3 last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
                <div className="flex-1">
                  <p className="text-slate-800">{activity.description}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

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
