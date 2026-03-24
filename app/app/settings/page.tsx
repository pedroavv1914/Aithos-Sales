import { redirect } from "next/navigation";
import { WorkspaceSettings } from "@/components/app/WorkspaceSettings";
import { getCurrentAppContext } from "@/lib/auth/app-context";
import { getWorkspaceForms } from "@/lib/services/forms";
import { getWorkspaceMembers } from "@/lib/services/workspaces";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getCurrentAppContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!context.workspace) {
    redirect("/app/onboarding");
  }

  const [members, forms] = await Promise.all([
    getWorkspaceMembers(context.workspace.id),
    getWorkspaceForms(context.workspace.id)
  ]);

  return (
    <WorkspaceSettings
      workspaceId={context.workspace.id}
      workspaceSlug={context.workspace.slug}
      members={members}
      forms={forms}
    />
  );
}
