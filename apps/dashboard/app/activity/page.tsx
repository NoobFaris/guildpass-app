import DashboardLayout from "@/components/DashboardLayout";
import { mockActivity } from "@/lib/mock-data";

export default function ActivityPage() {
  return (
    <DashboardLayout title="Activity">
      <div className="bg-white border border-slate-200 rounded-xl">
        <ul className="divide-y divide-slate-100">
          {mockActivity.map((activity) => (
            <li key={activity.id} className="px-6 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                {activity.actor.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-800">{activity.description}</p>
                  <span className="text-xs text-slate-500">{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">by {activity.actor}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
