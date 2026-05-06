import { NextResponse } from "next/server";
import { z } from "zod";
import { bulkAssignLeads, bulkMoveStage } from "@aithos/db";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";

export const runtime = "nodejs";

const leadIdsSchema = z.array(z.string().uuid()).min(1).max(200);

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("move_stage"),
    leadIds: leadIdsSchema,
    toStageId: z.string().uuid()
  }),
  z.object({
    action: z.literal("assign"),
    leadIds: leadIdsSchema,
    assignedTo: z.string().min(1).nullable()
  })
]);

export async function POST(request: Request) {
  try {
    const user = await requireApiSessionUser();
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ message: "workspaceId obrigatorio." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.uid, workspaceId);

    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Dados invalidos.", errors: parsed.error.flatten() }, { status: 422 });
    }

    const data = parsed.data;

    if (data.action === "move_stage") {
      await bulkMoveStage({ workspaceId, leadIds: data.leadIds, toStageId: data.toStageId, userId: user.uid });
    } else {
      await bulkAssignLeads({ workspaceId, leadIds: data.leadIds, assignedTo: data.assignedTo, userId: user.uid });
    }

    return NextResponse.json({ ok: true, affected: data.leadIds.length });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: "Falha na operacao em lote." }, { status: 500 });
  }
}
