"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InviteAcceptCardProps = {
  token: string;
  workspaceName?: string;
  requiresLogin: boolean;
};

export const InviteAcceptCard = ({ token, workspaceName, requiresLogin }: InviteAcceptCardProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const accept = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Falha ao aceitar convite.");
        return;
      }

      router.replace("/app");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (requiresLogin) {
    return (
      <section className="surface-elevated mx-auto mt-16 w-full max-w-xl p-6 text-center">
        <h1 className="text-2xl font-bold">Convite para {workspaceName ?? "workspace"}</h1>
        <p className="mt-3 text-sm text-muted">Entre na sua conta para aceitar este convite.</p>
        <button type="button" className="brand-button mt-6" onClick={() => router.push(`/login?next=/invite/${token}`)}>
          Fazer login
        </button>
      </section>
    );
  }

  return (
    <section className="surface-elevated mx-auto mt-16 w-full max-w-xl p-6 text-center">
      <h1 className="text-2xl font-bold">Convite para {workspaceName ?? "workspace"}</h1>
      <p className="mt-3 text-sm text-muted">Este convite expira em 48 horas.</p>

      {message ? <p className="mt-4 text-sm text-[color:var(--error)]">{message}</p> : null}

      <button type="button" className="brand-button mt-6" onClick={accept} disabled={loading}>
        {loading ? "Aceitando..." : "Aceitar convite"}
      </button>
    </section>
  );
};
