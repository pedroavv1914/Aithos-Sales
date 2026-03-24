"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicKey, getSupabaseUrl, isSupabaseClientConfigured } from "@/lib/supabase/shared";

let browserClient: SupabaseClient | null = null;

export const getSupabaseBrowserClient = () => {
  if (!isSupabaseClientConfigured()) {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(getSupabaseUrl(), getSupabasePublicKey());
  return browserClient;
};
