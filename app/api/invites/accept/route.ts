import { NextResponse } from "next/server";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { acceptInvite } from "@/lib/services/workspaces";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApiSessionUser();
    const payload = (await request.json()) as { token?: string };

    if (!payload.token) {
      return NextResponse.json({ message: "Token obrigatorio." }, { status: 400 });
    }

    const workspace = await acceptInvite({
      token: payload.token,
      userId: user.uid,
      email: user.email ?? "",
      displayName: user.name ?? user.email ?? "Usuario"
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    return NextResponse.json({ message: "Falha ao aceitar convite." }, { status: 400 });
  }
}
