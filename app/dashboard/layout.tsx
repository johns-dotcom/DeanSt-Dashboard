import { requireSession } from "@/lib/auth/workspace";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--cream)" }}>
      <Sidebar
        member={session.member}
        workspaceName={session.workspace.name}
        userEmail={session.user.email}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
