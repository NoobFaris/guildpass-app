export default function EmptyState({ title, description, icon }: { title: string; description?: string; icon: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      {description && <p className="text-slate-500">{description}</p>}
    </div>
  );
}
