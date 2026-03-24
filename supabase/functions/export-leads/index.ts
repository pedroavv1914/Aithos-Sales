import { createAdminClient } from "../_shared/supabase.ts";

type LeadCsvRow = {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  stage_id: string;
  score: number;
  tags: string[] | null;
  source: string | null;
  utm: {
    medium?: string;
    campaign?: string;
  } | null;
  closed_reason: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  assigned_to: string | null;
};

const encodeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

Deno.serve(async (request) => {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ message: "Metodo nao permitido." }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId");

    if (!workspaceId) {
      return new Response(JSON.stringify({ message: "workspaceId obrigatorio." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const client = createAdminClient();
    const { data: rows } = await client
      .from("leads")
      .select(
        "id,name,company,phone,email,stage_id,score,tags,source,utm,closed_reason,created_at,updated_at,closed_at,assigned_to"
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .returns<LeadCsvRow[]>();

    const headers = [
      "id",
      "nome",
      "empresa",
      "telefone",
      "email",
      "stage",
      "score",
      "tags",
      "source",
      "utm_medium",
      "utm_campaign",
      "closedReason",
      "createdAt",
      "updatedAt",
      "closedAt",
      "assignedTo"
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`${headers.join(",")}\n`));

        for (const row of rows ?? []) {
          const values = [
            row.id,
            row.name,
            row.company ?? "",
            row.phone,
            row.email ?? "",
            row.stage_id,
            row.score,
            (row.tags ?? []).join("|"),
            row.source ?? "",
            row.utm?.medium ?? "",
            row.utm?.campaign ?? "",
            row.closed_reason ?? "",
            row.created_at,
            row.updated_at,
            row.closed_at ?? "",
            row.assigned_to ?? ""
          ];

          controller.enqueue(encoder.encode(`${values.map(encodeCsv).join(",")}\n`));
        }

        controller.close();
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${workspaceId}.csv"`
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
