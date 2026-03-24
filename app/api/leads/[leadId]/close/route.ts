import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";
import { closeLead } from "@/lib/services/leads";

export const runtime = "nodejs";

const closeSchema = z.object({
  status: z.enum(["won", "lost"]),
  reason: z.string().min(2, "Motivo obrigatorio")
});

export async function POST(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const user = await requireApiSessionUser();
    const payload = closeSchema.parse(await request.json());
    const { leadId } = await context.params;
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ message: "workspaceId obrigatorio." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.uid, workspaceId);

    await closeLead({
      workspaceId,
      leadId,
      status: payload.status,
      reason: payload.reason,
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

    return NextResponse.json({ message: "Falha ao fechar lead." }, { status: 400 });
  }
}
