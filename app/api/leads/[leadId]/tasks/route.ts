import { NextResponse } from "next/server";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";
import { createLeadTask } from "@/lib/services/leads";
import { taskSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const user = await requireApiSessionUser();
    const payload = taskSchema.parse(await request.json());
    const { leadId } = await context.params;
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ message: "workspaceId obrigatorio." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.uid, workspaceId);

    const taskId = await createLeadTask({
      workspaceId,
      leadId,
      title: payload.title,
      dueAt: payload.dueAt,
      userId: user.uid
    });

    return NextResponse.json({ ok: true, taskId });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao criar tarefa." }, { status: 400 });
  }
}
