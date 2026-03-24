import "server-only";

import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { Notification } from "@/lib/types";

type NotificationRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
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

const serialize = (row: NotificationRow): Notification => ({
  id: row.id,
  workspaceId: row.workspace_id,
  userId: row.user_id,
  title: row.title,
  body: row.body,
  href: row.href ?? undefined,
  readAt: row.read_at ? toIso(row.read_at) : undefined,
  createdAt: toIso(row.created_at)
});

export const createNotification = async (params: {
  workspaceId: string;
  userId: string;
  title: string;
  body: string;
  href?: string;
}) => {
  if (!isSupabaseAdminConfigured()) {
    return;
  }

  const admin = getSupabaseAdminClient();
  await admin.from("notifications").insert({
    workspace_id: params.workspaceId,
    user_id: params.userId,
    title: params.title,
    body: params.body,
    href: params.href ?? null,
    read_at: null
  });
};

export const getUnreadNotificationCount = async (workspaceId: string, userId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return 0;
  }

  const admin = getSupabaseAdminClient();
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    return 0;
  }

  return Number(count ?? 0);
};

export const listNotifications = async (workspaceId: string, userId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return [] as Notification[];
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<NotificationRow[]>();

  if (error || !data) {
    return [] as Notification[];
  }

  return data.map((row) => serialize(row));
};

export const markNotificationsAsRead = async (workspaceId: string, userId: string) => {
  if (!isSupabaseAdminConfigured()) {
    return;
  }

  const admin = getSupabaseAdminClient();
  await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .is("read_at", null);
};
