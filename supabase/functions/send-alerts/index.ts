import { createAdminClient } from "../_shared/supabase.ts";

type WorkspaceRow = {
  id: string;
  name: string;
  timezone: string;
  alert_inactive_days: number;
};

const getLocalHour = (timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: timezone
  }).format(new Date());

const sendResendEmail = async (params: {
  to: string;
  subject: string;
  text: string;
}) => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!apiKey || !from) {
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text
    })
  });
};

Deno.serve(async () => {
  try {
    const client = createAdminClient();
    const { data: workspaces } = await client
      .from("workspaces")
      .select("id,name,timezone,alert_inactive_days")
      .returns<WorkspaceRow[]>();

    const now = new Date();

    for (const workspace of workspaces ?? []) {
      const timezone = workspace.timezone || "America/Sao_Paulo";
      const localHour = getLocalHour(timezone);
      if (localHour !== "08") {
        continue;
      }

      const days = Number(workspace.alert_inactive_days ?? 3);
      const inactivityThreshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: inactiveLeads } = await client
        .from("leads")
        .select("id,name,last_contact_at,created_at,assigned_to")
        .eq("workspace_id", workspace.id)
        .or(`last_contact_at.lte.${inactivityThreshold},last_contact_at.is.null`);

      const { data: overdueTasks } = await client
        .from("lead_tasks")
        .select("id,lead_id,title,due_at")
        .eq("workspace_id", workspace.id)
        .eq("status", "pending")
        .lte("due_at", now.toISOString());

      const { data: owners } = await client
        .from("workspace_members")
        .select("user_id,email,display_name")
        .eq("workspace_id", workspace.id)
        .eq("role", "owner")
        .eq("status", "active")
        .returns<Array<{ user_id: string; email: string; display_name: string }>>();

      if (!owners || owners.length === 0) {
        continue;
      }

      const bodyLines = [
        `Workspace: ${workspace.name}`,
        `Leads inativos: ${inactiveLeads?.length ?? 0}`,
        `Tarefas vencidas: ${overdueTasks?.length ?? 0}`
      ];
      const text = bodyLines.join("\n");

      for (const owner of owners) {
        await sendResendEmail({
          to: owner.email,
          subject: `[Aithos] Alertas diarios - ${workspace.name}`,
          text
        });

        await client.from("notifications").insert({
          workspace_id: workspace.id,
          user_id: owner.user_id,
          title: "Acoes pendentes do dia",
          body: bodyLines.join(" | "),
          href: "/app/pipeline"
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
