import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { mockMembers } from "@/lib/mock-data";

export default function MembersPage() {
  return (
    <DashboardLayout title="Members">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Wallet</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Roles</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{member.name}</td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">{member.wallet.slice(0, 6)}...{member.wallet.slice(-4)}</td>
                  <td className="px-6 py-4"><StatusBadge status={member.status} /></td>
                  <td className="px-6 py-4 text-slate-600">
                    {member.roles.map((role) => (
                      <span key={role} className="mr-2 px-2 py-1 bg-slate-100 rounded text-xs">{role}</span>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{new Date(member.lastActive).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
