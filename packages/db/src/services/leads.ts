import "server-only";

import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "../admin";
import { normalizePhone, normalizeText } from "../utils/normalize";
import type {
  Lead,
  LeadEvent,
  LeadTask,
  PipelineFilters,
  Priority,
  Stage
} from "../types";

type LeadRow = {
  id: string;
  workspace_id: string;
  name: string;
  name_normalized: string | null;
  phone: string;
  phone_normalized: string;
  email: string | null;
  email_normalized: string | null;
  company: string | null;
  company_normalized: string | null;
  need: string | null;
  score: number;
  budget: number | null;
  deadline: string | null;
  notes: string | null;
  source: string | null;
  priority: Priority;
  tags: string[] | null;
  stage_id: string;
  assigned_to: string | null;
  has_pending_task: boolean;
  last_contact_at: string | null;
  closed_at: string | null;
  closed_reason: string | null;
  status: "won" | "lost" | null;
  utm: Lead["utm"] | null;
  created_at: string;
  updated_at: string;
};

type StageRow = {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

type LeadEventRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  type: LeadEvent["type"];
  created_by: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type LeadTaskRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  title: string;
  due_at: string;
  status: LeadTask["status"];
  created_by: string;
  created_at: string;
  updated_at: string;
};

const toIso = (value: string | Date | null | undefined) => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

const nowIso = () => new Date().toISOString();

const serializeLead = (row: LeadRow): Lead => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  phone: row.phone,
  phoneNormalized: row.phone_normalized,
  email: row.email ?? undefined,
  emailNormalized: row.email_normalized ?? undefined,
  company: row.company ?? undefined,
  companyNormalized: row.company_normalized ?? undefined,
  need: row.need ?? undefined,
  score: Number(row.score ?? 0),
  budget: typeof row.budget === "number" ? row.budget : undefined,
  deadline: row.deadline ?? undefined,
  notes: row.notes ?? undefined,
  source: row.source ?? undefined,
  priority: row.priority ?? "medium",
  tags: Array.isArray(row.tags) ? row.tags : [],
  stageId: row.stage_id,
  assignedTo: row.assigned_to ?? undefined,
  hasPendingTask: Boolean(row.has_pending_task),
  lastContactAt: toIso(row.last_contact_at),
  closedAt: toIso(row.closed_at),
  closedReason: row.closed_reason ?? undefined,
  status: row.status ?? undefined,
  utm: row.utm ?? undefined,
  createdAt: toIso(row.created_at) ?? new Date(0).toISOString(),
  updatedAt: toIso(row.updated_at) ?? new Date(0).toISOString()
});

const serializeStage = (row: StageRow): Stage => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  order: Number(row.position ?? 0),
  isSystem: Boolean(row.is_system),
  createdAt: toIso(row.created_at) ?? new Date(0).toISOString(),
  updatedAt: toIso(row.updated_at) ?? new Date(0).toISOString()
});

const serializeEvent = (row: LeadEventRow): LeadEvent => ({
  id: row.id,
  leadId: row.lead_id,
  type: row.type ?? "created",
  createdBy: row.created_by ?? "system",
  payload: row.payload ?? {},
  createdAt: toIso(row.created_at) ?? new Date(0).toISOString()
});

const serializeTask = (row: LeadTaskRow): LeadTask => ({
  id: row.id,
  leadId: row.lead_id,
  title: row.title,
  dueAt: toIso(row.due_at) ?? new Date(0).toISOString(),
  status: row.status ?? "pending",
  createdBy: row.created_by ?? "",
  createdAt: toIso(row.created_at) ?? new Date(0).toISOString(),
  updatedAt: toIso(row.updated_at) ?? new Date(0).toISOString()
});

export const listStages = async (workspaceId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return [] as Stage[];
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("stages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true })
    .returns<StageRow[]>();

  if (error || !data) {
    return [] as Stage[];
  }

  return data.map((row) => serializeStage(row));
};

export const scoreFromLead = (lead: Lead) => {
  let score = 0;
  if (lead.need) score += 25;
  if (lead.budget && lead.budget >= 10000) score += 30;
  if (lead.company) score += 10;
  if (lead.tags.length > 0) score += 15;
  if (lead.priority === "high") score += 20;
  return Math.min(score, 100);
};

const applyFilters = (leads: Lead[], filters: PipelineFilters) => {
  const now = Date.now();

  return leads.filter((lead) => {
    if (filters.stageId && lead.stageId !== filters.stageId) {
      return false;
    }

    if (filters.source && lead.source !== filters.source) {
      return false;
    }

    if (typeof filters.budgetMin === "number" && (lead.budget ?? 0) < filters.budgetMin) {
      return false;
    }

    if (typeof filters.budgetMax === "number" && (lead.budget ?? 0) > filters.budgetMax) {
      return false;
    }

    if (typeof filters.scoreMin === "number" && lead.score < filters.scoreMin) {
      return false;
    }

    if (typeof filters.scoreMax === "number" && lead.score > filters.scoreMax) {
      return false;
    }

    if (typeof filters.noFollowUpDays === "number") {
      const lastContactMs = lead.lastContactAt ? new Date(lead.lastContactAt).getTime() : 0;
      const days = (now - lastContactMs) / (1000 * 60 * 60 * 24);
      if (days < filters.noFollowUpDays) {
        return false;
      }
    }

    if (filters.search) {
      const lookup = normalizeText(filters.search);
      const source = `${normalizeText(lead.name)} ${normalizeText(lead.phone)} ${normalizeText(
        lead.company ?? ""
      )}`;
      if (!source.includes(lookup)) {
        return false;
      }
    }

    return true;
  });
};

export const listLeads = async (workspaceId: string, filters: PipelineFilters = {}) => {
  if (!isSupabaseAdminConfigured()) {
    return [] as Lead[];
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .returns<LeadRow[]>();

  if (error || !data) {
    return [] as Lead[];
  }

  const leads = data.map((row) => serializeLead(row));
  return applyFilters(leads, filters);
};

export const getPipelineData = async (workspaceId: string, filters: PipelineFilters = {}) => {
  const [stages, leads] = await Promise.all([listStages(workspaceId), listLeads(workspaceId, filters)]);

  const grouped = stages.map((stage) => ({
    stage,
    leads: leads.filter((lead) => lead.stageId === stage.id)
  }));

  return {
    stages,
    leads,
    grouped
  };
};

const pushLeadEvent = async (params: {
  workspaceId: string;
  leadId: string;
  type: LeadEvent["type"];
  createdBy: string;
  payload: Record<string, unknown>;
}) => {
  const admin = getSupabaseAdminClient();
  await admin.from("lead_events").insert({
    workspace_id: params.workspaceId,
    lead_id: params.leadId,
    type: params.type,
    created_by: params.createdBy,
    payload: params.payload,
    created_at: nowIso()
  });
};

export const moveLeadStage = async (params: {
  workspaceId: string;
  leadId: string;
  fromStageId: string;
  toStageId: string;
  userId: string;
}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("leads")
    .update({
      stage_id: params.toStageId,
      updated_at: nowIso()
    })
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.leadId);

  if (error) {
    throw new Error("Falha ao mover lead de stage.");
  }

  await pushLeadEvent({
    workspaceId: params.workspaceId,
    leadId: params.leadId,
    type: "stage_changed",
    createdBy: params.userId,
    payload: {
      fromStageId: params.fromStageId,
      toStageId: params.toStageId,
      timestamp: new Date().toISOString()
    }
  });
};

export const createOrUpdateLeadFromCapture = async (params: {
  workspaceId: string;
  data: {
    name: string;
    whatsapp: string;
    company?: string;
    need?: string;
    email?: string;
    budget?: number;
    deadline?: string;
    notes?: string;
    utm?: Lead["utm"];
    source?: string;
  };
  createdBy?: string;
}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();
  const phoneNormalized = normalizePhone(params.data.whatsapp);
  const emailNormalized = params.data.email ? normalizeText(params.data.email) : undefined;

  let existingLead: LeadRow | null = null;

  const { data: phoneRows } = await admin
    .from("leads")
    .select("*")
    .eq("workspace_id", params.workspaceId)
    .eq("phone_normalized", phoneNormalized)
    .limit(1)
    .returns<LeadRow[]>();

  if (phoneRows && phoneRows.length > 0) {
    existingLead = phoneRows[0];
  } else if (emailNormalized) {
    const { data: emailRows } = await admin
      .from("leads")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .eq("email_normalized", emailNormalized)
      .limit(1)
      .returns<LeadRow[]>();

    if (emailRows && emailRows.length > 0) {
      existingLead = emailRows[0];
    }
  }

  const stages = await listStages(params.workspaceId);
  const firstStage = stages[0];

  if (!firstStage) {
    throw new Error("Nenhum stage configurado para o workspace.");
  }

  const now = nowIso();

  if (existingLead) {
    const mergedRow: LeadRow = {
      ...existingLead,
      name: params.data.name,
      name_normalized: normalizeText(params.data.name),
      phone: params.data.whatsapp,
      phone_normalized: phoneNormalized,
      email: params.data.email ?? existingLead.email,
      email_normalized: emailNormalized ?? existingLead.email_normalized,
      company: params.data.company ?? existingLead.company,
      company_normalized: params.data.company
        ? normalizeText(params.data.company)
        : existingLead.company_normalized,
      need: params.data.need ?? existingLead.need,
      budget: typeof params.data.budget === "number" ? params.data.budget : existingLead.budget,
      deadline: params.data.deadline ?? existingLead.deadline,
      notes: params.data.notes ?? existingLead.notes,
      source: params.data.source ?? existingLead.source,
      utm: params.data.utm ?? existingLead.utm,
      updated_at: now
    };

    const lead = serializeLead(mergedRow);
    lead.score = scoreFromLead(lead);

    const { error } = await admin
      .from("leads")
      .update({
        name: mergedRow.name,
        name_normalized: mergedRow.name_normalized,
        phone: mergedRow.phone,
        phone_normalized: mergedRow.phone_normalized,
        email: mergedRow.email,
        email_normalized: mergedRow.email_normalized,
        company: mergedRow.company,
        company_normalized: mergedRow.company_normalized,
        need: mergedRow.need,
        budget: mergedRow.budget,
        deadline: mergedRow.deadline,
        notes: mergedRow.notes,
        source: mergedRow.source,
        utm: mergedRow.utm,
        score: lead.score,
        updated_at: now
      })
      .eq("workspace_id", params.workspaceId)
      .eq("id", existingLead.id);

    if (error) {
      throw new Error("Falha ao atualizar lead existente.");
    }

    await pushLeadEvent({
      workspaceId: params.workspaceId,
      leadId: existingLead.id,
      type: "created",
      createdBy: params.createdBy ?? "public-form",
      payload: {
        source: "public_form",
        updated: true
      }
    });

    return lead;
  }

  const leadBase: Lead = {
    id: "",
    workspaceId: params.workspaceId,
    name: params.data.name,
    phone: params.data.whatsapp,
    phoneNormalized,
    email: params.data.email,
    emailNormalized,
    company: params.data.company,
    companyNormalized: params.data.company ? normalizeText(params.data.company) : undefined,
    need: params.data.need,
    score: 0,
    budget: params.data.budget,
    deadline: params.data.deadline,
    notes: params.data.notes,
    source: params.data.source ?? "public_form",
    priority: "medium",
    tags: [],
    stageId: firstStage.id,
    assignedTo: undefined,
    hasPendingTask: false,
    lastContactAt: undefined,
    closedAt: undefined,
    closedReason: undefined,
    status: undefined,
    utm: params.data.utm,
    createdAt: now,
    updatedAt: now
  };

  leadBase.score = scoreFromLead(leadBase);

  const { data, error } = await admin
    .from("leads")
    .insert({
      workspace_id: params.workspaceId,
      name: leadBase.name,
      name_normalized: normalizeText(leadBase.name),
      phone: leadBase.phone,
      phone_normalized: leadBase.phoneNormalized,
      email: leadBase.email ?? null,
      email_normalized: leadBase.emailNormalized ?? null,
      company: leadBase.company ?? null,
      company_normalized: leadBase.companyNormalized ?? null,
      need: leadBase.need ?? null,
      score: leadBase.score,
      budget: leadBase.budget ?? null,
      deadline: leadBase.deadline ?? null,
      notes: leadBase.notes ?? null,
      source: leadBase.source ?? null,
      priority: leadBase.priority,
      tags: leadBase.tags,
      stage_id: leadBase.stageId,
      assigned_to: null,
      has_pending_task: false,
      last_contact_at: null,
      closed_at: null,
      closed_reason: null,
      status: null,
      utm: leadBase.utm ?? null,
      created_at: now,
      updated_at: now
    })
    .select("*")
    .single<LeadRow>();

  if (error || !data) {
    throw new Error("Falha ao criar lead.");
  }

  await pushLeadEvent({
    workspaceId: params.workspaceId,
    leadId: data.id,
    type: "created",
    createdBy: params.createdBy ?? "public-form",
    payload: {
      source: "public_form",
      updated: false
    }
  });

  return serializeLead(data);
};

export const getLeadById = async (workspaceId: string, leadId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", leadId)
    .maybeSingle<LeadRow>();

  if (error || !data) {
    return null;
  }

  return serializeLead(data);
};

export const listLeadEvents = async (
  workspaceId: string,
  leadId: string,
  limit = 20,
  cursor?: string
) => {
  if (!isSupabaseAdminConfigured()) {
    return { events: [] as LeadEvent[], nextCursor: null as string | null };
  }

  const admin = getSupabaseAdminClient();
  let query = admin
    .from("lead_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query.returns<LeadEventRow[]>();

  if (error || !data) {
    return { events: [] as LeadEvent[], nextCursor: null as string | null };
  }

  const events = data.map((row) => serializeEvent(row));
  const last = events[events.length - 1];
  const nextCursor = last ? last.createdAt : null;

  return {
    events,
    nextCursor: events.length === limit ? nextCursor : null
  };
};

export const listLeadTasks = async (workspaceId: string, leadId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return [] as LeadTask[];
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("lead_tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .returns<LeadTaskRow[]>();

  if (error || !data) {
    return [] as LeadTask[];
  }

  return data.map((row) => serializeTask(row));
};

export const addLeadNote = async (params: {
  workspaceId: string;
  leadId: string;
  note: string;
  userId: string;
}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  await pushLeadEvent({
    workspaceId: params.workspaceId,
    leadId: params.leadId,
    type: "note_added",
    createdBy: params.userId,
    payload: { note: params.note }
  });

  const admin = getSupabaseAdminClient();
  await admin
    .from("leads")
    .update({ updated_at: nowIso() })
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.leadId);
};

export const createLeadTask = async (params: {
  workspaceId: string;
  leadId: string;
  title: string;
  dueAt: string;
  userId: string;
}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();
  const now = nowIso();

  const { data, error } = await admin
    .from("lead_tasks")
    .insert({
      workspace_id: params.workspaceId,
      lead_id: params.leadId,
      title: params.title,
      due_at: new Date(params.dueAt).toISOString(),
      status: "pending",
      created_by: params.userId,
      created_at: now,
      updated_at: now
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error("Falha ao criar tarefa.");
  }

  await admin
    .from("leads")
    .update({
      has_pending_task: true,
      updated_at: now
    })
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.leadId);

  await pushLeadEvent({
    workspaceId: params.workspaceId,
    leadId: params.leadId,
    type: "task_created",
    createdBy: params.userId,
    payload: {
      taskId: data.id,
      title: params.title,
      dueAt: params.dueAt
    }
  });

  return data.id;
};

export const completeLeadTask = async (params: {
  workspaceId: string;
  leadId: string;
  taskId: string;
  userId: string;
}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();
  const now = nowIso();

  const { error: taskError } = await admin
    .from("lead_tasks")
    .update({ status: "completed", updated_at: now })
    .eq("workspace_id", params.workspaceId)
    .eq("lead_id", params.leadId)
    .eq("id", params.taskId);

  if (taskError) {
    throw new Error("Falha ao concluir tarefa.");
  }

  const { data: pendingRows } = await admin
    .from("lead_tasks")
    .select("id")
    .eq("workspace_id", params.workspaceId)
    .eq("lead_id", params.leadId)
    .eq("status", "pending")
    .limit(1);

  await admin
    .from("leads")
    .update({
      has_pending_task: Boolean(pendingRows && pendingRows.length > 0),
      updated_at: now
    })
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.leadId);

  await pushLeadEvent({
    workspaceId: params.workspaceId,
    leadId: params.leadId,
    type: "task_completed",
    createdBy: params.userId,
    payload: {
      taskId: params.taskId
    }
  });
};

export const setLeadTags = async (params: {
  workspaceId: string;
  leadId: string;
  tags: string[];
}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const lead = await getLeadById(params.workspaceId, params.leadId);
  if (!lead) {
    throw new Error("Lead nao encontrado.");
  }

  const nextScore = scoreFromLead({ ...lead, tags: params.tags });
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("leads")
    .update({
      tags: params.tags,
      score: nextScore,
      updated_at: nowIso()
    })
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.leadId);

  if (error) {
    throw new Error("Falha ao atualizar tags.");
  }
};

export const closeLead = async (params: {
  workspaceId: string;
  leadId: string;
  status: "won" | "lost";
  reason: string;
  userId: string;
}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const now = nowIso();
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("leads")
    .update({
      status: params.status,
      closed_reason: params.reason,
      closed_at: now,
      updated_at: now
    })
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.leadId);

  if (error) {
    throw new Error("Falha ao fechar lead.");
  }

  await pushLeadEvent({
    workspaceId: params.workspaceId,
    leadId: params.leadId,
    type: "closed",
    createdBy: params.userId,
    payload: {
      status: params.status,
      reason: params.reason,
      timestamp: now
    }
  });
};

export const addStage = async (workspaceId: string, name: string) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const stages = await listStages(workspaceId);
  const order = stages.length;
  const admin = getSupabaseAdminClient();
  const now = nowIso();

  const { data, error } = await admin
    .from("stages")
    .insert({
      workspace_id: workspaceId,
      name,
      position: order,
      is_system: false,
      created_at: now,
      updated_at: now
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error("Falha ao criar stage.");
  }

  return data.id;
};

export const renameStage = async (workspaceId: string, stageId: string, name: string) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("stages")
    .update({
      name,
      updated_at: nowIso()
    })
    .eq("workspace_id", workspaceId)
    .eq("id", stageId);

  if (error) {
    throw new Error("Falha ao renomear stage.");
  }
};

export const reorderStages = async (workspaceId: string, orderedIds: string[]) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();

  for (const [index, stageId] of orderedIds.entries()) {
    const { error } = await admin
      .from("stages")
      .update({
        position: index,
        updated_at: nowIso()
      })
      .eq("workspace_id", workspaceId)
      .eq("id", stageId);

    if (error) {
      throw new Error("Falha ao reordenar stages.");
    }
  }
};

export const removeStage = async (workspaceId: string, stageId: string) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();
  const { data: stage, error: stageError } = await admin
    .from("stages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", stageId)
    .maybeSingle<StageRow>();

  if (stageError || !stage) {
    return;
  }

  if (stage.is_system) {
    throw new Error("Stages padrao nao podem ser removidos.");
  }

  const stages = await listStages(workspaceId);
  const fallbackStage = stages.find((item) => item.id !== stageId);

  if (!fallbackStage) {
    throw new Error("Nao e possivel remover o ultimo stage.");
  }

  await admin
    .from("leads")
    .update({
      stage_id: fallbackStage.id,
      updated_at: nowIso()
    })
    .eq("workspace_id", workspaceId)
    .eq("stage_id", stageId);

  const { error: deleteError } = await admin
    .from("stages")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", stageId);

  if (deleteError) {
    throw new Error("Falha ao remover stage.");
  }
};

export const createLead = async (params: {
  workspaceId: string;
  userId: string;
  data: {
    name: string;
    phone: string;
    email?: string;
    company?: string;
    need?: string;
    budget?: number;
    deadline?: string;
    source?: string;
    priority?: Priority;
    stageId?: string;
  };
}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();
  const { data } = params;
  const now = nowIso();

  const stages = await listStages(params.workspaceId);
  const targetStage = data.stageId
    ? stages.find((s) => s.id === data.stageId) ?? stages[0]
    : stages[0];

  if (!targetStage) {
    throw new Error("Nenhuma etapa configurada no workspace.");
  }

  const leadBase: Lead = {
    id: "",
    workspaceId: params.workspaceId,
    name: data.name,
    phone: data.phone,
    phoneNormalized: normalizePhone(data.phone),
    email: data.email || undefined,
    emailNormalized: data.email ? normalizeText(data.email) : undefined,
    company: data.company || undefined,
    companyNormalized: data.company ? normalizeText(data.company) : undefined,
    need: data.need || undefined,
    score: 0,
    budget: data.budget,
    deadline: data.deadline || undefined,
    source: data.source || undefined,
    priority: data.priority ?? "medium",
    tags: [],
    stageId: targetStage.id,
    hasPendingTask: false,
    createdAt: now,
    updatedAt: now
  };

  leadBase.score = scoreFromLead(leadBase);

  const { data: row, error } = await admin
    .from("leads")
    .insert({
      workspace_id: params.workspaceId,
      name: leadBase.name,
      name_normalized: normalizeText(leadBase.name),
      phone: leadBase.phone,
      phone_normalized: leadBase.phoneNormalized,
      email: leadBase.email ?? null,
      email_normalized: leadBase.emailNormalized ?? null,
      company: leadBase.company ?? null,
      company_normalized: leadBase.companyNormalized ?? null,
      need: leadBase.need ?? null,
      score: leadBase.score,
      budget: leadBase.budget ?? null,
      deadline: leadBase.deadline ?? null,
      notes: null,
      source: leadBase.source ?? null,
      priority: leadBase.priority,
      tags: [],
      stage_id: targetStage.id,
      assigned_to: null,
      has_pending_task: false,
      last_contact_at: null,
      closed_at: null,
      closed_reason: null,
      status: null,
      utm: null,
      created_at: now,
      updated_at: now
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !row) {
    throw new Error("Falha ao criar lead.");
  }

  await pushLeadEvent({
    workspaceId: params.workspaceId,
    leadId: row.id,
    type: "created",
    createdBy: params.userId,
    payload: { source: data.source ?? "manual" }
  });

  return row.id;
};

export const updateLead = async (params: {
  workspaceId: string;
  leadId: string;
  userId: string;
  data: {
    name?: string;
    phone?: string;
    email?: string | null;
    company?: string;
    need?: string;
    budget?: number | null;
    deadline?: string;
    notes?: string;
    source?: string;
    priority?: Priority;
  };
}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const lead = await getLeadById(params.workspaceId, params.leadId);
  if (!lead) {
    throw new Error("Lead nao encontrado.");
  }

  const admin = getSupabaseAdminClient();
  const { data } = params;
  const now = nowIso();

  const patch: Record<string, unknown> = { updated_at: now };

  if (data.name !== undefined) {
    patch.name = data.name;
    patch.name_normalized = normalizeText(data.name);
  }
  if (data.phone !== undefined) {
    patch.phone = data.phone;
    patch.phone_normalized = normalizePhone(data.phone);
  }
  if ("email" in data) {
    patch.email = data.email || null;
    patch.email_normalized = data.email ? normalizeText(data.email) : null;
  }
  if ("company" in data) {
    patch.company = data.company || null;
    patch.company_normalized = data.company ? normalizeText(data.company) : null;
  }
  if ("need" in data) patch.need = data.need || null;
  if ("budget" in data) patch.budget = data.budget ?? null;
  if ("deadline" in data) patch.deadline = data.deadline || null;
  if ("notes" in data) patch.notes = data.notes || null;
  if ("source" in data) patch.source = data.source || null;
  if (data.priority !== undefined) patch.priority = data.priority;

  // Recalcula score com os dados atualizados
  const merged: Lead = {
    ...lead,
    name: (data.name ?? lead.name),
    company: ("company" in data ? data.company : lead.company),
    need: ("need" in data ? data.need : lead.need),
    budget: ("budget" in data ? (data.budget ?? undefined) : lead.budget),
    priority: (data.priority ?? lead.priority),
    tags: lead.tags
  };
  patch.score = scoreFromLead(merged);

  const { error } = await admin
    .from("leads")
    .update(patch)
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.leadId);

  if (error) {
    throw new Error("Falha ao atualizar lead.");
  }

  await pushLeadEvent({
    workspaceId: params.workspaceId,
    leadId: params.leadId,
    type: "updated",
    createdBy: params.userId,
    payload: { fields: Object.keys(data) }
  });
};

export const getLeadWithTimeline = async (workspaceId: string, leadId: string) => {
  const [lead, events, tasks] = await Promise.all([
    getLeadById(workspaceId, leadId),
    listLeadEvents(workspaceId, leadId, 20),
    listLeadTasks(workspaceId, leadId)
  ]);

  return {
    lead,
    events: events.events,
    nextCursor: events.nextCursor,
    tasks
  };
};
