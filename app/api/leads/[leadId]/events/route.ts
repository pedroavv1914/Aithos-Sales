import { NextResponse } from "next/server";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";
import { listLeadEvents } from "@/lib/services/leads";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const user = await requireApiSessionUser();
    const { leadId } = await context.params;
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId");
    const cursor = url.searchParams.get("cursor") ?? undefined;

    if (!workspaceId) {
      return NextResponse.json({ message: "workspaceId obrigatorio." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.uid, workspaceId);

    const result = await listLeadEvents(workspaceId, leadId, 20, cursor);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao listar eventos." }, { status: 400 });
  }
}
