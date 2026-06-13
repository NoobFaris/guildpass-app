import DashboardLayout from "@/components/DashboardLayout";
import { mockGuilds } from "@/lib/mock-data";

export default function GuildsPage() {
  return (
    <DashboardLayout title="Guilds">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockGuilds.map((guild) => (
          <div key={guild.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{guild.name}</h3>
            <p className="text-slate-600 mb-4">{guild.description}</p>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-slate-500">Members:</span>
                <span className="font-semibold text-slate-800 ml-2">{guild.memberCount}</span>
              </div>
              <div>
                <span className="text-slate-500">Passes:</span>
                <span className="font-semibold text-slate-800 ml-2">{guild.passCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
