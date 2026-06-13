export default function Header({ title }: { title: string }) {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
    </header>
  );
}
