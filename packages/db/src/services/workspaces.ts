import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Resend } from "resend";
import {
  DEFAULT_FORM_FIELDS,
  DEFAULT_STAGE_NAMES,
  INVITE_EXPIRATION_HOURS
} from "../constants";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "../admin";
import { slugify } from "../utils/normalize";
import type { Invite, MemberRole, Workspace, WorkspaceMember } from "../types";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  timezone: string;
  alert_inactive_days: number;
  created_at: string;
  updated_at: string;
};

type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: MemberRole;
  status: "active" | "invited";
  created_at: string;
  updated_at: string;
};

type InviteRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: MemberRole;
  token_hash: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

const asIso = (value: string | Date | null | undefined) => {
  if (!value) {
    return new Date(0).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
};

const serializeWorkspace = (row: WorkspaceRow): Workspace => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  ownerId: row.owner_id,
  timezone: row.timezone,
  alertInactiveDays: row.alert_inactive_days,
  createdAt: asIso(row.created_at),
  updatedAt: asIso(row.updated_at)
});

const serializeMember = (row: WorkspaceMemberRow): WorkspaceMember => ({
  userId: row.user_id,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  status: row.status,
  createdAt: asIso(row.created_at),
  updatedAt: asIso(row.updated_at)
});

const serializeInvite = (row: InviteRow): Invite => ({
  id: row.id,
  workspaceId: row.workspace_id,
  email: row.email,
  role: row.role,
  tokenHash: row.token_hash,
  invitedBy: row.invited_by,
  expiresAt: asIso(row.expires_at),
  acceptedAt: row.accepted_at ? asIso(row.accepted_at) : undefined,
  createdAt: asIso(row.created_at)
});

const QUERY_TIMEOUT_MS = 10_000;
const MAX_SLUG_ATTEMPTS = 8;

type QueryErrorLike = {
  code?: string;
  message?: string;
  details?: string;
};

const withQueryTimeout = async <T>(task: (signal: AbortSignal) => PromiseLike<T>): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    return await Promise.resolve(task(controller.signal));
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.message.toLowerCase().includes("aborted") ||
        error.message.toLowerCase().includes("timeout"))
    ) {
      throw new Error(`Timeout na comunicacao com o banco (${QUERY_TIMEOUT_MS}ms).`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const isSlugConflict = (error: QueryErrorLike | null | undefined) => {
  if (!error) {
    return false;
  }

  if (error.code !== "23505") {
    return false;
  }

  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return text.includes("workspaces_slug_key") || text.includes("(slug)") || text.includes(" slug ");
};

const makeWorkspaceSlugCandidate = (workspaceName: string, attempt: number) => {
  const baseSlug = slugify(workspaceName) || "workspace";

  if (attempt === 0) {
    return baseSlug;
  }

  return `${baseSlug}-${randomBytes(2).toString("hex")}`;
};

const ensureAdmin = () => {
  return getSupabaseAdminClient();
};

export const getWorkspaceById = async (workspaceId: string): Promise<Workspace | null> => {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await withQueryTimeout((signal) =>
    admin
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .abortSignal(signal)
      .maybeSingle<WorkspaceRow>()
  );

  if (error || !data) {
    return null;
  }

  return serializeWorkspace(data);
};

export const getWorkspaceBySlug = async (slug: string): Promise<Workspace | null> => {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await withQueryTimeout((signal) =>
    admin
      .from("workspaces")
      .select("*")
      .eq("slug", slug)
      .abortSignal(signal)
      .maybeSingle<WorkspaceRow>()
  );

  if (error || !data) {
    return null;
  }

  return serializeWorkspace(data);
};

export const getUserWorkspaceMemberships = async (userId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return [] as Array<{ workspace: Workspace; member: WorkspaceMember }>;
  }

  const admin = getSupabaseAdminClient();
  const { data: members, error } = await withQueryTimeout((signal) =>
    admin
      .from("workspace_members")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .abortSignal(signal)
      .returns<WorkspaceMemberRow[]>()
  );

  if (error) {
    console.error("[workspaces] Falha ao buscar memberships.", { userId, error });
    return [] as Array<{ workspace: Workspace; member: WorkspaceMember }>;
  }

  if (!members || members.length === 0) {
    return [] as Array<{ workspace: Workspace; member: WorkspaceMember }>;
  }

  const workspaceIds = Array.from(new Set(members.map((member) => member.workspace_id)));
  const { data: workspaceRows, error: workspaceError } = await withQueryTimeout((signal) =>
    admin
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds)
      .abortSignal(signal)
      .returns<WorkspaceRow[]>()
  );

  if (workspaceError) {
    console.error("[workspaces] Falha ao buscar workspaces das memberships.", {
      userId,
      workspaceIds,
      error: workspaceError
    });
    return [] as Array<{ workspace: Workspace; member: WorkspaceMember }>;
  }

  if (!workspaceRows) {
    return [] as Array<{ workspace: Workspace; member: WorkspaceMember }>;
  }

  const workspaceMap = new Map(workspaceRows.map((row) => [row.id, serializeWorkspace(row)]));

  const result = members
    .map((member) => {
      const workspace = workspaceMap.get(member.workspace_id);
      if (!workspace) {
        return null;
      }

      return {
        workspace,
        member: serializeMember(member)
      };
    })
    .filter(Boolean) as Array<{ workspace: Workspace; member: WorkspaceMember }>;

  return result.sort((a, b) => {
    if (a.member.role === b.member.role) {
      return 0;
    }
    if (a.member.role === "owner") {
      return -1;
    }
    if (b.member.role === "owner") {
      return 1;
    }
    return 0;
  });
};

export const createWorkspaceOnboarding = async (params: {
  userId: string;
  email: string;
  displayName: string;
  workspaceName: string;
  timezone: string;
}) => {
  ensureAdmin();

  const existing = await getUserWorkspaceMemberships(params.userId);
  if (existing.length > 0) {
    return existing[0].workspace;
  }

  const admin = getSupabaseAdminClient();
  const workspaceId = randomUUID();
  const defaultPipelineId = randomUUID();
  const defaultFormId = randomUUID();
  const now = new Date().toISOString();
  let workspaceCreated = false;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidateSlug = makeWorkspaceSlugCandidate(params.workspaceName, attempt);
    const { error: workspaceError } = await withQueryTimeout((signal) =>
      admin
        .from("workspaces")
        .insert({
          id: workspaceId,
          name: params.workspaceName,
          slug: candidateSlug,
          owner_id: params.userId,
          timezone: params.timezone,
          alert_inactive_days: 3,
          created_at: now,
          updated_at: now
        })
        .abortSignal(signal)
    );

    if (!workspaceError) {
      workspaceCreated = true;
      break;
    }

    if (isSlugConflict(workspaceError)) {
      continue;
    }

    const message = workspaceError.message ?? "erro desconhecido";
    throw new Error(`Nao foi possivel criar workspace (${message}).`);
  }

  if (!workspaceCreated) {
    throw new Error("Nao foi possivel gerar um slug unico para o workspace.");
  }

  const stageRows = DEFAULT_STAGE_NAMES.map((stageName, index) => ({
    id: randomUUID(),
    workspace_id: workspaceId,
    name: stageName,
    position: index,
    is_system: true,
    created_at: now,
    updated_at: now
  }));

  const provisioningResults = await Promise.allSettled([
    withQueryTimeout((signal) =>
      admin
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: params.userId,
          email: params.email.toLowerCase(),
          display_name: params.displayName,
          role: "owner",
          status: "active",
          created_at: now,
          updated_at: now
        })
        .abortSignal(signal)
    ),
    withQueryTimeout((signal) =>
      admin
        .from("pipelines")
        .insert({
          id: defaultPipelineId,
          workspace_id: workspaceId,
          name: "Funil Principal",
          created_at: now,
          updated_at: now
        })
        .abortSignal(signal)
    ),
    withQueryTimeout((signal) => admin.from("stages").insert(stageRows).abortSignal(signal)),
    withQueryTimeout((signal) =>
      admin
        .from("forms")
        .insert({
          id: defaultFormId,
          workspace_id: workspaceId,
          title: "Formulario de Captura",
          description: "Preencha os dados para receber contato do time comercial.",
          fields: DEFAULT_FORM_FIELDS,
          consent_text:
            "Autorizo o contato da equipe Aithos Sales e o tratamento dos meus dados para fins comerciais.",
          success_message: "Recebemos seu contato! Nosso time respondera em breve.",
          created_at: now,
          updated_at: now
        })
        .abortSignal(signal)
    )
  ]);

  const provisioningLabels = [
    "membro owner",
    "pipeline padrao",
    "stages padrao",
    "formulario padrao"
  ] as const;
  const provisioningErrors: Array<{ label: string; message: string }> = [];

  provisioningResults.forEach((result, index) => {
    const label = provisioningLabels[index];

    if (result.status === "rejected") {
      const message = result.reason instanceof Error ? result.reason.message : "erro desconhecido";
      provisioningErrors.push({ label, message });
      return;
    }

    if (result.value.error) {
      provisioningErrors.push({
        label,
        message: result.value.error.message ?? "erro desconhecido"
      });
    }
  });

  if (provisioningErrors.length > 0) {
    try {
      await withQueryTimeout((signal) =>
        admin.from("workspaces").delete().eq("id", workspaceId).abortSignal(signal)
      );
    } catch (rollbackError) {
      console.error("[workspaces] Falha ao fazer rollback do onboarding.", {
        workspaceId,
        rollbackError
      });
    }

    throw new Error(
      `Nao foi possivel concluir onboarding (${provisioningErrors[0].label}: ${provisioningErrors[0].message}).`
    );
  }

  const created = await getWorkspaceById(workspaceId);
  if (!created) {
    throw new Error("Nao foi possivel carregar workspace criado.");
  }

  return created;
};

const hashInviteToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const createWorkspaceInvite = async (params: {
  workspaceId: string;
  email: string;
  role: MemberRole;
  invitedBy: string;
}) => {
  ensureAdmin();

  const workspace = await getWorkspaceById(params.workspaceId);
  if (!workspace) {
    throw new Error("Workspace nao encontrado.");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_HOURS * 60 * 60 * 1000).toISOString();

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("invites")
    .insert({
      workspace_id: params.workspaceId,
      email: params.email.toLowerCase(),
      role: params.role,
      invited_by: params.invitedBy,
      token_hash: tokenHash,
      expires_at: expiresAt
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error("Nao foi possivel criar convite.");
  }

  const appUrl =
    process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${token}`;
  const resend = getResendClient();

  if (resend && process.env.RESEND_FROM_EMAIL) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: params.email,
      subject: `Convite para o workspace ${workspace.name}`,
      html: `<p>Voce foi convidado para o workspace <strong>${workspace.name}</strong>.</p><p><a href="${inviteUrl}">Aceitar convite</a></p><p>Este convite expira em 48 horas.</p>`
    });
  }

  return { inviteId: data.id, inviteUrl };
};

export const getInviteByToken = async (token: string) => {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const tokenHash = hashInviteToken(token);
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle<InviteRow>();

  if (error || !data) {
    return null;
  }

  return serializeInvite(data);
};

export const acceptInvite = async (params: {
  token: string;
  userId: string;
  email: string;
  displayName: string;
}) => {
  ensureAdmin();

  const invite = await getInviteByToken(params.token);
  if (!invite) {
    throw new Error("Convite invalido.");
  }

  if (invite.acceptedAt) {
    throw new Error("Convite ja utilizado.");
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    throw new Error("Convite expirado.");
  }

  if (invite.email.toLowerCase() !== params.email.toLowerCase()) {
    throw new Error("Este convite pertence a outro e-mail.");
  }

  const now = new Date().toISOString();
  const admin = getSupabaseAdminClient();

  const { error: memberError } = await admin.from("workspace_members").upsert(
    {
      workspace_id: invite.workspaceId,
      user_id: params.userId,
      email: params.email.toLowerCase(),
      display_name: params.displayName,
      role: invite.role,
      status: "active",
      created_at: now,
      updated_at: now
    },
    {
      onConflict: "workspace_id,user_id"
    }
  );

  if (memberError) {
    throw new Error("Falha ao adicionar membro no workspace.");
  }

  const { error: inviteError } = await admin
    .from("invites")
    .update({ accepted_at: now })
    .eq("id", invite.id);

  if (inviteError) {
    throw new Error("Falha ao concluir convite.");
  }

  return getWorkspaceById(invite.workspaceId);
};

export const updateWorkspacePreferences = async (
  workspaceId: string,
  data: { alertInactiveDays?: number; timezone?: string }
) => {
  ensureAdmin();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (typeof data.alertInactiveDays !== "undefined") {
    updates.alert_inactive_days = data.alertInactiveDays;
  }
  if (typeof data.timezone !== "undefined") {
    updates.timezone = data.timezone;
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("workspaces").update(updates).eq("id", workspaceId);

  if (error) {
    throw new Error("Falha ao salvar preferencias.");
  }
};

export const getWorkspaceMembers = async (workspaceId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return [] as WorkspaceMember[];
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .returns<WorkspaceMemberRow[]>();

  if (error || !data) {
    return [] as WorkspaceMember[];
  }

  return data.map((row) => serializeMember(row));
};
