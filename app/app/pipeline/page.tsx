import { redirect } from "next/navigation";
import { KanbanBoardClient } from "@/components/pipeline/KanbanBoardClient";
import { getCurrentAppContext } from "@/lib/auth/app-context";
import { getPipelineData } from "@/lib/services/leads";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const context = await getCurrentAppContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!context.workspace) {
    redirect("/app/onboarding");
  }

  const pipeline = await getPipelineData(context.workspace.id);

  return (
    <KanbanBoardClient
      workspaceId={context.workspace.id}
      stages={pipeline.stages}
      leads={pipeline.leads}
    />
  );
}
