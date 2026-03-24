const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const getSupabaseUrl = () => supabaseUrl ?? "";
export const getSupabasePublicKey = () => supabasePublicKey ?? "";

export const isSupabaseClientConfigured = () =>
  Boolean(supabaseUrl && supabasePublicKey);
