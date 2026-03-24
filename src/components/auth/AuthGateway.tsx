"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthScreen, type AuthTab, type LoginPayload, type SignupPayload } from "@/components/AuthScreen";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseClientConfigured } from "@/lib/supabase/shared";

type AuthGatewayProps = {
  initialTab: AuthTab;
};

export const AuthGateway = ({ initialTab }: AuthGatewayProps) => {
  const router = useRouter();
  const params = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [info, setInfo] = useState<string | undefined>();

  const nextPath = useMemo(() => params.get("next") || "/app", [params]);

  const getClient = () => {
    if (!isSupabaseClientConfigured()) {
      throw new Error("Configure as variaveis NEXT_PUBLIC_SUPABASE_* para autenticar.");
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      throw new Error("Supabase Auth indisponivel.");
    }

    return client;
  };

  const handleLogin = async (payload: LoginPayload) => {
    setLoading(true);
    setError(undefined);
    setInfo(undefined);

    try {
      const supabase = getClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password
      });

      if (signInError || !data.user) {
        throw new Error(signInError?.message ?? "Falha no login.");
      }

      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        throw new Error("Verifique seu e-mail antes de acessar o app.");
      }

      router.replace(nextPath);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (payload: SignupPayload) => {
    setLoading(true);
    setError(undefined);
    setInfo(undefined);

    try {
      const supabase = getClient();
      const appUrl = window.location.origin;

      const { error: signUpError } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/app")}`,
          data: {
            full_name: `${payload.firstName} ${payload.lastName}`.trim()
          }
        }
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      setInfo("Conta criada. Verifique seu e-mail para ativar o acesso e entrar no sistema.");
      router.replace("/login");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha no cadastro.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(undefined);
    setInfo(undefined);

    try {
      const supabase = getClient();
      const appUrl = window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`
        }
      });

      if (oauthError) {
        throw new Error(oauthError.message);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha no login Google.");
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      initialTab={initialTab}
      loading={loading}
      errorMessage={error ?? (params.get("message") ?? undefined)}
      infoMessage={info}
      onLogin={handleLogin}
      onSignup={handleSignup}
      onGoogle={handleGoogle}
      onTabChange={(tab) => {
        if (tab === "login") {
          router.replace(`/login${nextPath !== "/app" ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
        } else {
          router.replace(`/signup${nextPath !== "/app" ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
        }
      }}
    />
  );
};
