"use client";

import DashboardLayout from "@/components/DashboardLayout";
import LastUpdated from "@/components/LastUpdated";
import { useActivityFeed } from "@/lib/hooks/useActivityFeed";

const TYPE_ICON: Record<string, string> = {
  member_joined:  "👤",
  pass_created:   "🎫",
  pass_purchased: "💳",
  role_changed:   "🔄",
  access_granted: "🔓",
};

export default function ActivityPage() {
  const { events, lastUpdated, loading } = useActivityFeed();

  return (
    <DashboardLayout title="Activity">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{events.length} event{events.length !== 1 ? "s" : ""}</p>
        <LastUpdated date={lastUpdated} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl">
        {loading && events.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">Loading activity…</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((activity) => (
              <li key={activity.id} className="px-6 py-4 flex items-start gap-4 animate-[fadeIn_0.3s_ease-in]">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-lg shrink-0">
                  {TYPE_ICON[activity.type] ?? "📋"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800 truncate">{activity.description}</p>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">by {activity.actor}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
