"use client";

import { useMemo, useState } from "react";
import type { CaptureForm, WorkspaceMember } from "@/lib/types";

type WorkspaceSettingsProps = {
  workspaceId: string;
  workspaceSlug: string;
  members: WorkspaceMember[];
  forms: CaptureForm[];
};

export const WorkspaceSettings = ({
  workspaceId,
  workspaceSlug,
  members,
  forms
}: WorkspaceSettingsProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "admin" | "member">("member");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [formState, setFormState] = useState(forms);
  const [savingFormId, setSavingFormId] = useState<string | null>(null);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === b.role) return 0;
      if (a.role === "owner") return -1;
      if (b.role === "owner") return 1;
      if (a.role === "admin") return -1;
      if (b.role === "admin") return 1;
      return 0;
    });
  }, [members]);

  const sendInvite = async () => {
    if (!email.trim()) {
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/invites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, email, role })
      });

      const data = (await response.json()) as { inviteUrl?: string; message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Falha ao enviar convite.");
        return;
      }

      setMessage(`Convite enviado. URL de teste: ${data.inviteUrl}`);
      setEmail("");
    } finally {
      setSending(false);
    }
  };

  const toggleField = (formId: string, key: string, prop: "enabled" | "required") => {
    setFormState((current) =>
      current.map((form) => {
        if (form.id !== formId) {
          return form;
        }

        return {
          ...form,
          fields: form.fields.map((field) =>
            field.key === key ? { ...field, [prop]: !field[prop] } : field
          )
        };
      })
    );
  };

  const updateText = (
    formId: string,
    prop: "title" | "description" | "consentText" | "successMessage",
    value: string
  ) => {
    setFormState((current) =>
      current.map((form) => (form.id === formId ? { ...form, [prop]: value } : form))
    );
  };

  const saveForm = async (form: CaptureForm) => {
    setSavingFormId(form.id);

    try {
      const response = await fetch(`/api/forms/${form.id}?workspaceId=${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          fields: form.fields,
          consentText: form.consentText,
          successMessage: form.successMessage
        })
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Falha ao salvar configuracoes do formulario.");
        return;
      }

      setMessage(`Formulario ${form.title} atualizado com sucesso.`);
    } finally {
      setSavingFormId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="surface-card p-5">
        <h2 className="text-lg font-semibold">Convites de membros</h2>
        <p className="mt-1 text-sm text-muted">Convites expiram automaticamente em 48 horas.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-[2fr,1fr,auto]">
          <input
            className="brand-input"
            placeholder="email@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <select
            className="brand-input"
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          <button type="button" className="brand-button" onClick={sendInvite}>
            {sending ? "Enviando..." : "Convidar"}
          </button>
        </div>

        {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
      </section>

      <section className="surface-card p-5">
        <h2 className="text-lg font-semibold">Membros do workspace</h2>
        <div className="mt-3 space-y-2">
          {sortedMembers.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between rounded-lg border border-[color:var(--brand-border)] px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-[color:var(--text-primary)]">{member.displayName}</p>
                <p className="text-xs text-muted">{member.email}</p>
              </div>
              <span className="brand-badge">{member.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {formState.map((form) => (
          <article key={form.id} className="surface-card space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Configuracao do formulario</h2>
              <p className="text-xs text-muted">
                URL publica: /f/{workspaceSlug}/{form.id}
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-muted">Titulo</span>
              <input
                className="brand-input"
                value={form.title}
                onChange={(event) => updateText(form.id, "title", event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-muted">Descricao</span>
              <textarea
                className="brand-input min-h-20"
                value={form.description ?? ""}
                onChange={(event) => updateText(form.id, "description", event.target.value)}
              />
            </label>

            <div>
              <p className="mb-2 text-sm text-muted">Campos configuraveis</p>
              <div className="space-y-2">
                {form.fields.map((field) => (
                  <div
                    key={field.key}
                    className="rounded-lg border border-[color:var(--brand-border)] px-3 py-2"
                  >
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">{field.label}</p>
                    <div className="mt-2 flex gap-4 text-xs text-muted">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={() => toggleField(form.id, field.key, "enabled")}
                        />
                        Ativo
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={() => toggleField(form.id, field.key, "required")}
                        />
                        Obrigatorio
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-muted">Texto LGPD</span>
              <textarea
                className="brand-input min-h-20"
                value={form.consentText}
                onChange={(event) => updateText(form.id, "consentText", event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-muted">Mensagem de sucesso</span>
              <textarea
                className="brand-input min-h-20"
                value={form.successMessage}
                onChange={(event) => updateText(form.id, "successMessage", event.target.value)}
              />
            </label>

            <button
              type="button"
              className="brand-button"
              onClick={() => saveForm(form)}
              disabled={savingFormId === form.id}
            >
              {savingFormId === form.id ? "Salvando..." : "Salvar configuracoes"}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
};
