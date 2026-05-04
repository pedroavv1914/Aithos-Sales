import "server-only";

import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "../admin";
import { DEFAULT_FORM_FIELDS } from "../constants";
import type { CaptureForm } from "../types";
import { getWorkspaceBySlug } from "./workspaces";

type FormRow = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  fields: CaptureForm["fields"] | null;
  consent_text: string;
  success_message: string;
  created_at: string;
  updated_at: string;
};

const toIso = (value: string | Date | null | undefined) => {
  if (!value) {
    return new Date(0).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

const serializeForm = (row: FormRow): CaptureForm => ({
  id: row.id,
  workspaceId: row.workspace_id,
  title: row.title,
  description: row.description ?? undefined,
  fields: Array.isArray(row.fields) ? row.fields : [],
  consentText: row.consent_text,
  successMessage: row.success_message,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

export const createCaptureForm = async (workspaceId: string, title: string) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("forms")
    .insert({
      workspace_id: workspaceId,
      title,
      description: null,
      fields: DEFAULT_FORM_FIELDS,
      consent_text: "Autorizo o contato da equipe e o tratamento dos meus dados para fins comerciais.",
      success_message: "Recebemos seu contato! Nosso time respondera em breve.",
      created_at: now,
      updated_at: now
    })
    .select("*")
    .single<FormRow>();

  if (error || !data) {
    throw new Error("Falha ao criar formulario.");
  }

  return serializeForm(data);
};

export const getWorkspaceForms = async (workspaceId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return [] as CaptureForm[];
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("forms")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .returns<FormRow[]>();

  if (error || !data) {
    return [] as CaptureForm[];
  }

  return data.map((row) => serializeForm(row));
};

export const getCaptureForm = async (workspaceId: string, formId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("forms")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", formId)
    .maybeSingle<FormRow>();

  if (error || !data) {
    return null;
  }

  return serializeForm(data);
};

export const updateCaptureForm = async (
  workspaceId: string,
  formId: string,
  payload: Partial<Pick<CaptureForm, "title" | "description" | "fields" | "consentText" | "successMessage">>
) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase nao configurado.");
  }

  const admin = getSupabaseAdminClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (typeof payload.title !== "undefined") {
    updates.title = payload.title;
  }
  if (typeof payload.description !== "undefined") {
    updates.description = payload.description;
  }
  if (typeof payload.fields !== "undefined") {
    updates.fields = payload.fields;
  }
  if (typeof payload.consentText !== "undefined") {
    updates.consent_text = payload.consentText;
  }
  if (typeof payload.successMessage !== "undefined") {
    updates.success_message = payload.successMessage;
  }

  const { data, error } = await admin
    .from("forms")
    .update(updates)
    .eq("workspace_id", workspaceId)
    .eq("id", formId)
    .select("*")
    .single<FormRow>();

  if (error || !data) {
    throw new Error("Falha ao atualizar formulario.");
  }

  return serializeForm(data);
};

export const getCaptureFormBySlugAndId = async (workspaceSlug: string, formId: string) => {
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    return null;
  }

  const form = await getCaptureForm(workspace.id, formId);
  if (!form) {
    return null;
  }

  return {
    workspace,
    form
  };
};
