import { NextResponse } from "next/server";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";
import { listLeads } from "@/lib/services/leads";
import { mapLeadsToCsvRows } from "@/lib/services/dashboard";

export const runtime = "nodejs";

const toCsvValue = (value: string | number) => {
  const raw = String(value ?? "");
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
};

export async function GET(request: Request) {
  try {
    const user = await requireApiSessionUser();
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ message: "workspaceId obrigatorio." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.uid, workspaceId);

    const leads = await listLeads(workspaceId);
    const rows = mapLeadsToCsvRows(leads);

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

        for (const row of rows) {
          const csvLine = headers
            .map((header) => toCsvValue((row as Record<string, string | number>)[header] ?? ""))
            .join(",");
          controller.enqueue(encoder.encode(`${csvLine}\n`));
        }

        controller.close();
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${workspaceId}.csv"`
      }
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao exportar CSV." }, { status: 400 });
  }
}
