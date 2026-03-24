import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
};

export const getCurrentSessionUser = async (): Promise<SessionUser | null> => {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? undefined;
  const fallbackName = (user.user_metadata?.name as string | undefined) ?? undefined;
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? undefined;

  return {
    uid: user.id,
    email: user.email ?? undefined,
    name: fullName ?? fallbackName,
    picture: avatarUrl,
    emailVerified: Boolean(user.email_confirmed_at)
  };
};
