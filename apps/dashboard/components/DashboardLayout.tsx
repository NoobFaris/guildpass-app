import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title={title} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
