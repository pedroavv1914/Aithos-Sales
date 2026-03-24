import { NextResponse } from "next/server";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";
import { createWorkspaceInvite } from "@/lib/services/workspaces";
import { inviteCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApiSessionUser();
    const payload = inviteCreateSchema.parse(await request.json());
    const membership = await requireWorkspaceAccess(user.uid, payload.workspaceId);

    if (membership.member.role === "member") {
      return NextResponse.json(
        { message: "Apenas owner/admin podem convidar membros." },
        { status: 403 }
      );
    }

    const invite = await createWorkspaceInvite({
      workspaceId: payload.workspaceId,
      email: payload.email,
      role: payload.role,
      invitedBy: user.uid
    });

    return NextResponse.json(invite);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao criar convite." }, { status: 400 });
  }
}
