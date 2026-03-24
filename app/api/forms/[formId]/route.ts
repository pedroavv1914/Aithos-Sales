import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiAuthError, requireApiSessionUser } from "@/lib/auth/require-api-user";
import { requireWorkspaceAccess, WorkspaceAccessError } from "@/lib/auth/workspace-access";
import { updateCaptureForm } from "@/lib/services/forms";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z
    .array(
      z.object({
        key: z.enum(["name", "whatsapp", "company", "need", "email", "budget", "deadline", "notes"]),
        label: z.string(),
        enabled: z.boolean(),
        required: z.boolean(),
        placeholder: z.string().optional()
      })
    )
    .optional(),
  consentText: z.string().optional(),
  successMessage: z.string().optional()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ formId: string }> }
) {
  try {
    const user = await requireApiSessionUser();
    const payload = schema.parse(await request.json());
    const { formId } = await context.params;
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ message: "workspaceId obrigatorio." }, { status: 400 });
    }

    const membership = await requireWorkspaceAccess(user.uid, workspaceId);

    if (membership.member.role === "member") {
      return NextResponse.json(
        { message: "Apenas owner/admin podem editar formularios." },
        { status: 403 }
      );
    }

    const form = await updateCaptureForm(workspaceId, formId, payload);
    return NextResponse.json({ form });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json({ message: "Falha ao atualizar formulario." }, { status: 400 });
  }
}

