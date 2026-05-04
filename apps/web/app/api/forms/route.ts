import { NextResponse } from "next/server";
import { createCaptureForm } from "@aithos/db";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApiSessionUser();
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ message: "workspaceId obrigatorio." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.uid, workspaceId);

    const body = await request.json();
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Novo formulario";

    const form = await createCaptureForm(workspaceId, title);

    return NextResponse.json({ ok: true, form }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: "Falha ao criar formulario." }, { status: 500 });
  }
}
