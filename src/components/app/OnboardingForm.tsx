"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const OnboardingForm = () => {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setTimezone(detected);
      }
    } catch {
      setTimezone("America/Sao_Paulo");
    }
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/onboarding/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceName, timezone })
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "Falha ao criar workspace.");
        return;
      }

      router.replace("/app");
      router.refresh();
    } catch {
      setError("Falha de rede ao criar workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="surface-elevated mx-auto mt-16 w-full max-w-lg p-6">
      <h1 className="text-2xl font-bold">Onboarding do Workspace</h1>
      <p className="mt-2 text-sm text-muted">
        Crie seu workspace e pipeline padrao para iniciar o funil comercial.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm uppercase tracking-[0.1em] text-muted">Nome do workspace</span>
          <input
            className="brand-input"
            placeholder="Aithos Sales"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm uppercase tracking-[0.1em] text-muted">Fuso horario</span>
          <input
            className="brand-input"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            required
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-[color:var(--error)]">{error}</p> : null}

      <button type="submit" className="brand-button mt-6 w-full" disabled={loading}>
        {loading ? "Criando..." : "Criar workspace"}
      </button>
    </form>
  );
};
