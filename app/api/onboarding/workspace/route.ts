import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { createWorkspaceOnboarding } from "@/lib/services/workspaces";
import { onboardingSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const user = await requireApiSessionUser();
    const payload = onboardingSchema.parse(await request.json());

    const workspace = await createWorkspaceOnboarding({
      userId: user.uid,
      email: user.email ?? "",
      displayName: user.name ?? user.email ?? "Usuario",
      workspaceName: payload.workspaceName,
      timezone: payload.timezone
    });

    console.info("[onboarding] Workspace criado.", {
      userId: user.uid,
      workspaceId: workspace.id,
      elapsedMs: Date.now() - startedAt
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Payload invalido." },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Falha ao criar workspace.";
    console.error("[onboarding] Falha ao criar workspace.", {
      elapsedMs: Date.now() - startedAt,
      error
    });

    return NextResponse.json({ message }, { status: 500 });
  }
}
