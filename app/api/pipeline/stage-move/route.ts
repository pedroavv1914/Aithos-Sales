import { NextResponse } from "next/server";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";
import { moveLeadStage } from "@/lib/services/leads";
import { stageMoveSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApiSessionUser();
    const payload = stageMoveSchema.parse(await request.json());
    await requireWorkspaceAccess(user.uid, payload.workspaceId);

    await moveLeadStage({
      workspaceId: payload.workspaceId,
      leadId: payload.leadId,
      fromStageId: payload.fromStageId,
      toStageId: payload.toStageId,
      userId: user.uid
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao mover lead." }, { status: 400 });
  }
}
