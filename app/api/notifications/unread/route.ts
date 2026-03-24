import { NextResponse } from "next/server";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { getCurrentAppContext } from "@/lib/auth/app-context";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiSessionUser();
    const context = await getCurrentAppContext();

    return NextResponse.json({ unread: context.unreadNotifications });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    return NextResponse.json({ message: "Falha ao obter notificacoes." }, { status: 400 });
  }
}
