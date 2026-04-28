import { redirect } from "next/navigation";
import { LeadsScreen } from "@/features/leads/LeadsScreen";
import { getLeadsPayload } from "@/features/crm/data/repository";
import { getCurrentAppContext } from "@/lib/auth/app-context";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const context = await getCurrentAppContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!context.workspace) {
    redirect("/app/onboarding");
  }

  const payload = await getLeadsPayload(context.workspace.id);
  return <LeadsScreen workspaceId={context.workspace.id} payload={payload} />;
}
