import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";
import { setLeadTags } from "@/lib/services/leads";

export const runtime = "nodejs";

const tagsSchema = z.object({ tags: z.array(z.string()).default([]) });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const user = await requireApiSessionUser();
    const payload = tagsSchema.parse(await request.json());
    const { leadId } = await context.params;
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ message: "workspaceId obrigatorio." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.uid, workspaceId);

    await setLeadTags({ workspaceId, leadId, tags: payload.tags });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao atualizar tags." }, { status: 400 });
  }
}
