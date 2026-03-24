import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { getCurrentAppContext } from "@/lib/auth/app-context";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await getCurrentAppContext();

  if (!context.user) {
    redirect("/login");
  }

  return (
    <div className="app-theme">
      <AppShell
        userName={context.user.name ?? context.user.email ?? "Usuario"}
        workspaceName={context.workspace?.name}
        unreadNotifications={context.unreadNotifications}
      >
        {children}
      </AppShell>
    </div>
  );
}
