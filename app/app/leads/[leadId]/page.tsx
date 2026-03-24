import { notFound, redirect } from "next/navigation";
import { LeadDetails } from "@/components/leads/LeadDetails";
import { getCurrentAppContext } from "@/lib/auth/app-context";
import { getLeadWithTimeline } from "@/lib/services/leads";

export const dynamic = "force-dynamic";

export default async function LeadDetailsPage({
  params
}: {
  params: Promise<{ leadId: string }>;
}) {
  const context = await getCurrentAppContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!context.workspace) {
    redirect("/app/onboarding");
  }

  const { leadId } = await params;
  const data = await getLeadWithTimeline(context.workspace.id, leadId);

  if (!data.lead) {
    notFound();
  }

  return (
    <LeadDetails
      workspaceId={context.workspace.id}
      lead={data.lead}
      tasks={data.tasks}
      events={data.events}
      nextCursor={data.nextCursor}
    />
  );
}
