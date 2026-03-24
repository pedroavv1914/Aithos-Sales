"use client";

import { FormEvent, useMemo, useState } from "react";
import type { CaptureForm } from "@/lib/types";
import { formatWhatsapp } from "@/lib/utils/normalize";

type PublicLeadFormProps = {
  workspaceSlug: string;
  formId: string;
  form: CaptureForm;
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
};

type FormState = {
  name: string;
  whatsapp: string;
  company: string;
  need: string;
  email: string;
  budget: string;
  deadline: string;
  notes: string;
  consent: boolean;
};

const initialState: FormState = {
  name: "",
  whatsapp: "",
  company: "",
  need: "",
  email: "",
  budget: "",
  deadline: "",
  notes: "",
  consent: false
};

export const PublicLeadForm = ({ workspaceSlug, formId, form, utm }: PublicLeadFormProps) => {
  const [state, setState] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const enabledFields = useMemo(() => form.fields.filter((field) => field.enabled), [form.fields]);

  const fieldError = (fieldKey: keyof FormState) => {
    const config = enabledFields.find((field) => field.key === fieldKey);
    if (!config?.required) {
      return false;
    }

    return String(state[fieldKey]).trim().length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const missingRequired = enabledFields.some(
      (field) => field.required && String(state[field.key as keyof FormState]).trim().length === 0
    );

    if (missingRequired) {
      setError("Preencha os campos obrigatorios.");
      return;
    }

    if (!state.consent) {
      setError("Voce precisa aceitar o consentimento LGPD.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/public/forms/${workspaceSlug}/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          whatsapp: state.whatsapp,
          company: state.company || undefined,
          need: state.need || undefined,
          email: state.email || undefined,
          budget: state.budget ? Number(state.budget) : undefined,
          deadline: state.deadline || undefined,
          notes: state.notes || undefined,
          consent: state.consent,
          utm
        })
      });

      const data = (await response.json()) as { message?: string; successMessage?: string };

      if (!response.ok) {
        setError(data.message ?? "Falha ao enviar formulario.");
        return;
      }

      setSuccess(data.successMessage ?? form.successMessage);
      setState(initialState);
    } catch {
      setError("Falha de rede ao enviar formulario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="surface-elevated mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{form.title}</h1>
      {form.description ? <p className="mt-2 text-muted">{form.description}</p> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {enabledFields.map((field) => {
          const key = field.key as keyof FormState;
          const isTextArea = field.key === "notes" || field.key === "need";
          const isFullWidth = field.key === "notes" || field.key === "need";

          return (
            <label
              key={field.key}
              className={`flex flex-col gap-2 ${isFullWidth ? "sm:col-span-2" : ""}`}
            >
              <span className="text-sm uppercase tracking-[0.1em] text-muted">
                {field.label}
                {field.required ? " *" : ""}
              </span>

              {isTextArea ? (
                <textarea
                  className="brand-input min-h-24 resize-y"
                  placeholder={field.placeholder}
                  value={state[key] as string}
                  onChange={(event) =>
                    setState((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              ) : (
                <input
                  className="brand-input"
                  placeholder={field.placeholder}
                  value={state[key] as string}
                  onChange={(event) => {
                    const nextValue =
                      field.key === "whatsapp" ? formatWhatsapp(event.target.value) : event.target.value;
                    setState((current) => ({ ...current, [key]: nextValue }));
                  }}
                />
              )}

              {fieldError(key) ? <span className="text-xs text-[color:var(--error)]">Obrigatorio.</span> : null}
            </label>
          );
        })}
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={state.consent}
          onChange={(event) => setState((current) => ({ ...current, consent: event.target.checked }))}
          className="mt-1"
        />
        <span>{form.consentText}</span>
      </label>

      {error ? <p className="mt-4 text-sm text-[color:var(--error)]">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}

      <button type="submit" className="brand-button mt-6 w-full" disabled={loading}>
        {loading ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
};
