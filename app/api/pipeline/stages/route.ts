import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";
import { addStage, removeStage, renameStage, reorderStages } from "@/lib/services/leads";

export const runtime = "nodejs";

const addSchema = z.object({ workspaceId: z.string().min(1), name: z.string().min(2) });
const renameSchema = z.object({
  workspaceId: z.string().min(1),
  stageId: z.string().min(1),
  name: z.string().min(2)
});
const reorderSchema = z.object({
  workspaceId: z.string().min(1),
  orderedIds: z.array(z.string()).min(1)
});

export async function POST(request: Request) {
  try {
    const user = await requireApiSessionUser();
    const payload = addSchema.parse(await request.json());
    const membership = await requireWorkspaceAccess(user.uid, payload.workspaceId);

    if (membership.member.role === "member") {
      return NextResponse.json(
        { message: "Apenas owner/admin podem criar stages." },
        { status: 403 }
      );
    }

    const stageId = await addStage(payload.workspaceId, payload.name);
    return NextResponse.json({ stageId });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao adicionar stage." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiSessionUser();
    const body = (await request.json()) as {
      action?: "rename" | "reorder";
      workspaceId?: string;
      stageId?: string;
      name?: string;
      orderedIds?: string[];
    };

    if (body.action === "reorder") {
      const payload = reorderSchema.parse(body);
      const membership = await requireWorkspaceAccess(user.uid, payload.workspaceId);

      if (membership.member.role === "member") {
        return NextResponse.json(
          { message: "Apenas owner/admin podem reordenar stages." },
          { status: 403 }
        );
      }

      await reorderStages(payload.workspaceId, payload.orderedIds);
      return NextResponse.json({ ok: true });
    }

    const payload = renameSchema.parse(body);
    const membership = await requireWorkspaceAccess(user.uid, payload.workspaceId);

    if (membership.member.role === "member") {
      return NextResponse.json(
        { message: "Apenas owner/admin podem renomear stages." },
        { status: 403 }
      );
    }

    await renameStage(payload.workspaceId, payload.stageId, payload.name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao atualizar stage." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiSessionUser();
    const payload = z
      .object({ workspaceId: z.string().min(1), stageId: z.string().min(1) })
      .parse(await request.json());
    const membership = await requireWorkspaceAccess(user.uid, payload.workspaceId);

    if (membership.member.role === "member") {
      return NextResponse.json(
        { message: "Apenas owner/admin podem remover stages." },
        { status: 403 }
      );
    }

    await removeStage(payload.workspaceId, payload.stageId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao remover stage." }, { status: 400 });
  }
}
