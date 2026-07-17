import Sidebar from "./Sidebar";
import Header from "./Header";
import type { Session } from "@/lib/auth/session";

/**
 * DashboardLayout wraps every dashboard page with the shared Sidebar + Header.
 * The optional `session` prop is forwarded to the Sidebar so it can display
 * the current user's role and conditionally render permission-aware elements.
 */
export default function DashboardLayout({
  title,
  children,
  session,
}: {
  title: string;
  children: React.ReactNode;
  /** Active user session — forwarded to the Sidebar for role display. */
  session?: Session;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar session={session} />
      <div className="flex-1 ml-64">
        <Header title={title} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
