import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminClient: SupabaseClient | null = null;

const isPlaceholderValue = (value: string | undefined) => {
  if (!value) {
    return true;
  }

  const normalized = value.trim();
  if (!normalized) {
    return true;
  }

  const lowered = normalized.toLowerCase();

  if (normalized.startsWith("<") && normalized.endsWith(">")) {
    return true;
  }

  return (
    lowered.includes("preencher") ||
    lowered.includes("placeholder") ||
    lowered.includes("your_project_ref") ||
    lowered.includes("changeme")
  );
};

const isValidSupabaseUrl = (value: string | undefined) => {
  if (!value || isPlaceholderValue(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const isLikelyServiceRoleKey = (value: string | undefined) => {
  if (!value || isPlaceholderValue(value)) {
    return false;
  }

  if (value.startsWith("sb_secret_")) {
    return true;
  }

  if (value.startsWith("eyJ")) {
    return value.split(".").length === 3;
  }

  return value.length >= 40;
};

export const isSupabaseAdminConfigured = () =>
  isValidSupabaseUrl(supabaseUrl) && isLikelyServiceRoleKey(serviceRoleKey);

const getAdminConfigError = () => {
  const missingOrInvalid: string[] = [];

  if (!isValidSupabaseUrl(supabaseUrl)) {
    missingOrInvalid.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!isLikelyServiceRoleKey(serviceRoleKey)) {
    missingOrInvalid.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missingOrInvalid.length === 0) {
    return "Supabase Admin nao configurado.";
  }

  return `Supabase Admin nao configurado. Verifique: ${missingOrInvalid.join(", ")}.`;
};

export const getSupabaseAdminClient = () => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error(getAdminConfigError());
  }

  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient(supabaseUrl as string, serviceRoleKey as string, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return adminClient;
};
