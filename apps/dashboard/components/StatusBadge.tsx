export default function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    draft: "bg-slate-100 text-slate-800",
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.inactive}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
