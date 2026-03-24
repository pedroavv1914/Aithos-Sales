import { NextResponse } from "next/server";
import { PUBLIC_FORM_RATE_LIMIT_PER_HOUR } from "@/lib/constants";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getCaptureFormBySlugAndId } from "@/lib/services/forms";
import { createOrUpdateLeadFromCapture } from "@/lib/services/leads";
import { normalizePhone } from "@/lib/utils/normalize";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WHATSAPP_REGEX = /^\(\d{2}\) \d{5}-\d{4}$/;

const getClientIp = (request: Request) => {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp ?? "unknown";
};

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceSlug: string; formId: string }> }
) {
  const { workspaceSlug, formId } = await context.params;

  const data = await getCaptureFormBySlugAndId(workspaceSlug, formId);
  if (!data) {
    return NextResponse.json({ message: "Formulario nao encontrado." }, { status: 404 });
  }

  const payload = (await request.json()) as {
    name?: string;
    whatsapp?: string;
    company?: string;
    need?: string;
    email?: string;
    budget?: number;
    deadline?: string;
    notes?: string;
    consent?: boolean;
    utm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    };
  };

  if (!payload.consent) {
    return NextResponse.json({ message: "Consentimento LGPD obrigatorio." }, { status: 400 });
  }

  if (!payload.name || payload.name.trim().length < 2) {
    return NextResponse.json({ message: "Nome obrigatorio." }, { status: 400 });
  }

  if (!payload.whatsapp || !WHATSAPP_REGEX.test(payload.whatsapp)) {
    return NextResponse.json(
      { message: "WhatsApp invalido. Use (99) 99999-9999." },
      { status: 400 }
    );
  }

  if (payload.email && !EMAIL_REGEX.test(payload.email)) {
    return NextResponse.json({ message: "E-mail invalido." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { message: "Backend Supabase nao configurado para capturas." },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const hourBucket = new Date().toISOString().slice(0, 13);
  const rateKey = `${data.workspace.id}:${ip}:${hourBucket}`;
  const admin = getSupabaseAdminClient();

  const { data: rateRow, error: rateError } = await admin
    .from("rate_limits")
    .select("count")
    .eq("id", rateKey)
    .maybeSingle<{ count: number }>();

  if (rateError) {
    return NextResponse.json({ message: "Falha ao validar limite de envio." }, { status: 500 });
  }

  const count = Number(rateRow?.count ?? 0);
  if (count >= PUBLIC_FORM_RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { message: "Limite de envios atingido. Tente novamente em 1 hora." },
      { status: 429 }
    );
  }

  const { error: upsertRateError } = await admin.from("rate_limits").upsert(
    {
      id: rateKey,
      workspace_id: data.workspace.id,
      ip,
      hour_bucket: hourBucket,
      count: count + 1,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "id"
    }
  );

  if (upsertRateError) {
    return NextResponse.json({ message: "Falha ao registrar limite de envio." }, { status: 500 });
  }

  await createOrUpdateLeadFromCapture({
    workspaceId: data.workspace.id,
    data: {
      name: payload.name,
      whatsapp: payload.whatsapp,
      company: payload.company,
      need: payload.need,
      email: payload.email,
      budget: typeof payload.budget === "number" ? payload.budget : undefined,
      deadline: payload.deadline,
      notes: payload.notes,
      source: payload.utm?.source || "public_form",
      utm: payload.utm
    }
  });

  return NextResponse.json({
    ok: true,
    successMessage: data.form.successMessage,
    normalizedPhone: normalizePhone(payload.whatsapp)
  });
}
