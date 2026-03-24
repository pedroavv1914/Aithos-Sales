import { createAdminClient } from "../_shared/supabase.ts";

const RATE_LIMIT_PER_HOUR = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WHATSAPP_REGEX = /^\(\d{2}\) \d{5}-\d{4}$/;

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const scoreFromLead = (lead: {
  need?: string;
  budget?: number;
  company?: string;
  tags?: string[];
  priority?: "low" | "medium" | "high";
}) => {
  let score = 0;
  if (lead.need) score += 25;
  if (lead.budget && lead.budget >= 10000) score += 30;
  if (lead.company) score += 10;
  if (lead.tags && lead.tags.length > 0) score += 15;
  if (lead.priority === "high") score += 20;
  return Math.min(score, 100);
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Metodo nao permitido." }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = (await request.json()) as {
      workspaceId?: string;
      formId?: string;
      lead?: {
        name?: string;
        whatsapp?: string;
        company?: string;
        need?: string;
        email?: string;
        budget?: number;
        deadline?: string;
        notes?: string;
        consent?: boolean;
        source?: string;
        utm?: {
          source?: string;
          medium?: string;
          campaign?: string;
          term?: string;
          content?: string;
        };
      };
    };

    if (!payload.workspaceId || !payload.formId || !payload.lead) {
      return new Response(JSON.stringify({ message: "workspaceId, formId e lead sao obrigatorios." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!payload.lead.consent) {
      return new Response(JSON.stringify({ message: "Consentimento LGPD obrigatorio." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!payload.lead.name || payload.lead.name.trim().length < 2) {
      return new Response(JSON.stringify({ message: "Nome obrigatorio." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!payload.lead.whatsapp || !WHATSAPP_REGEX.test(payload.lead.whatsapp)) {
      return new Response(JSON.stringify({ message: "WhatsApp invalido. Use (99) 99999-9999." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (payload.lead.email && !EMAIL_REGEX.test(payload.lead.email)) {
      return new Response(JSON.stringify({ message: "E-mail invalido." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const client = createAdminClient();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const hourBucket = new Date().toISOString().slice(0, 13);
    const rateKey = `${payload.workspaceId}:${ip}:${hourBucket}`;

    const { data: rateRow } = await client
      .from("rate_limits")
      .select("count")
      .eq("id", rateKey)
      .maybeSingle<{ count: number }>();

    const count = Number(rateRow?.count ?? 0);
    if (count >= RATE_LIMIT_PER_HOUR) {
      return new Response(JSON.stringify({ message: "Limite de envios atingido. Tente em 1 hora." }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }

    await client.from("rate_limits").upsert(
      {
        id: rateKey,
        workspace_id: payload.workspaceId,
        ip,
        hour_bucket: hourBucket,
        count: count + 1,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

    const { data: form } = await client
      .from("forms")
      .select("success_message")
      .eq("workspace_id", payload.workspaceId)
      .eq("id", payload.formId)
      .maybeSingle<{ success_message: string }>();

    const phoneNormalized = normalizePhone(payload.lead.whatsapp);
    const emailNormalized = payload.lead.email ? normalizeText(payload.lead.email) : null;

    let leadId: string | null = null;
    const { data: existingByPhone } = await client
      .from("leads")
      .select("id, tags")
      .eq("workspace_id", payload.workspaceId)
      .eq("phone_normalized", phoneNormalized)
      .limit(1)
      .returns<Array<{ id: string; tags: string[] | null }>>();

    if (existingByPhone && existingByPhone.length > 0) {
      leadId = existingByPhone[0].id;
    } else if (emailNormalized) {
      const { data: existingByEmail } = await client
        .from("leads")
        .select("id, tags")
        .eq("workspace_id", payload.workspaceId)
        .eq("email_normalized", emailNormalized)
        .limit(1)
        .returns<Array<{ id: string; tags: string[] | null }>>();

      if (existingByEmail && existingByEmail.length > 0) {
        leadId = existingByEmail[0].id;
      }
    }

    const { data: stageRows } = await client
      .from("stages")
      .select("id")
      .eq("workspace_id", payload.workspaceId)
      .order("position", { ascending: true })
      .limit(1)
      .returns<Array<{ id: string }>>();

    if (!stageRows || stageRows.length === 0) {
      return new Response(JSON.stringify({ message: "Workspace sem stages configurados." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const baseScore = scoreFromLead({
      need: payload.lead.need,
      budget: payload.lead.budget,
      company: payload.lead.company,
      tags: [],
      priority: "medium"
    });

    if (leadId) {
      await client
        .from("leads")
        .update({
          name: payload.lead.name,
          name_normalized: normalizeText(payload.lead.name),
          phone: payload.lead.whatsapp,
          phone_normalized: phoneNormalized,
          email: payload.lead.email ?? null,
          email_normalized: emailNormalized,
          company: payload.lead.company ?? null,
          company_normalized: payload.lead.company ? normalizeText(payload.lead.company) : null,
          need: payload.lead.need ?? null,
          budget: payload.lead.budget ?? null,
          deadline: payload.lead.deadline ?? null,
          notes: payload.lead.notes ?? null,
          source: payload.lead.source ?? payload.lead.utm?.source ?? "public_form",
          utm: payload.lead.utm ?? null,
          score: baseScore,
          updated_at: new Date().toISOString()
        })
        .eq("id", leadId)
        .eq("workspace_id", payload.workspaceId);
    } else {
      const { data: insertedLead } = await client
        .from("leads")
        .insert({
          workspace_id: payload.workspaceId,
          stage_id: stageRows[0].id,
          name: payload.lead.name,
          name_normalized: normalizeText(payload.lead.name),
          phone: payload.lead.whatsapp,
          phone_normalized: phoneNormalized,
          email: payload.lead.email ?? null,
          email_normalized: emailNormalized,
          company: payload.lead.company ?? null,
          company_normalized: payload.lead.company ? normalizeText(payload.lead.company) : null,
          need: payload.lead.need ?? null,
          score: baseScore,
          budget: payload.lead.budget ?? null,
          deadline: payload.lead.deadline ?? null,
          notes: payload.lead.notes ?? null,
          source: payload.lead.source ?? payload.lead.utm?.source ?? "public_form",
          priority: "medium",
          tags: [],
          has_pending_task: false,
          utm: payload.lead.utm ?? null
        })
        .select("id")
        .single<{ id: string }>();

      leadId = insertedLead?.id ?? null;
    }

    if (!leadId) {
      return new Response(JSON.stringify({ message: "Falha ao criar/atualizar lead." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    await client.from("lead_events").insert({
      workspace_id: payload.workspaceId,
      lead_id: leadId,
      type: "created",
      created_by: "public-form",
      payload: {
        source: "public_form"
      }
    });

    return new Response(
      JSON.stringify({
        ok: true,
        successMessage: form?.success_message ?? "Recebemos seu contato! Nosso time respondera em breve."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ message: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
