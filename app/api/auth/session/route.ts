import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CreateSessionPayload = {
  accessToken?: string;
  refreshToken?: string;
};

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { message: "Supabase nao configurado no servidor." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as CreateSessionPayload;
  const accessToken = body.accessToken;
  const refreshToken = body.refreshToken;

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { message: "accessToken e refreshToken sao obrigatorios." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (error || !data.user) {
    return NextResponse.json({ message: "Falha ao criar sessao." }, { status: 400 });
  }

  const provider = data.user.app_metadata?.provider as string | undefined;
  if (provider === "email" && !data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { message: "Verifique seu e-mail antes de acessar o app." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await getSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await getCurrentSessionUser();
  return NextResponse.json({ user });
}
