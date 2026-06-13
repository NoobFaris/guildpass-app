import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { mockPasses } from "@/lib/mock-data";

export default function PassesPage() {
  return (
    <DashboardLayout title="Passes">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Description</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Price</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Supply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockPasses.map((pass) => (
                <tr key={pass.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{pass.name}</td>
                  <td className="px-6 py-4 text-slate-600">{pass.description}</td>
                  <td className="px-6 py-4"><StatusBadge status={pass.status} /></td>
                  <td className="px-6 py-4 text-slate-600">{pass.price !== undefined ? `${pass.price} ETH` : "Free"}</td>
                  <td className="px-6 py-4 text-slate-600">{pass.currentSupply} / {pass.maxSupply ?? "∞"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
