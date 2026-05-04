"use client";

import * as React from "react";
import { Link2, PlusCircle, Save } from "lucide-react";
import { FormBuilder, PublicFormPreview } from "@/components/crm";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, useToast } from "@/components/ui";
import type { CaptureForm, FormsPayload } from "@/types";

type FormsScreenProps = {
  workspaceId: string;
  payload: FormsPayload;
};

const cloneForm = (form: CaptureForm): CaptureForm => ({
  ...form,
  fields: form.fields.map((field) => ({ ...field }))
});

export const FormsScreen = ({ workspaceId, payload }: FormsScreenProps) => {
  const { toast } = useToast();
  const [forms, setForms] = React.useState(payload.forms.map(cloneForm));
  const [activeId, setActiveId] = React.useState(payload.forms[0]?.id ?? "");
  const [saving, setSaving] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const activeForm = forms.find((form) => form.id === activeId) ?? forms[0];

  const createForm = async () => {
    setCreating(true);
    try {
      const response = await fetch(`/api/forms?workspaceId=${workspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Formulario ${forms.length + 1}` })
      });

      if (!response.ok) {
        toast({ title: "Falha ao criar", description: "Nao foi possivel criar o formulario.", variant: "destructive" });
        return;
      }

      const data = await response.json();
      setForms((current) => [...current, cloneForm(data.form)]);
      setActiveId(data.form.id);
      toast({ title: "Formulario criado", description: data.form.title, variant: "success" });
    } finally {
      setCreating(false);
    }
  };

  const saveForm = async () => {
    if (!activeForm) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/forms/${activeForm.id}?workspaceId=${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeForm.title,
          description: activeForm.description,
          fields: activeForm.fields.map((field) => ({
            key: field.key,
            label: field.label,
            enabled: field.enabled,
            required: field.required,
            placeholder: field.placeholder
          })),
          consentText: activeForm.consentText,
          successMessage: activeForm.successMessage
        })
      });

      if (!response.ok) {
        toast({
          title: "Falha ao salvar",
          description: "Nao foi possivel atualizar o formulario.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Formulario salvo",
        description: "Configuracoes atualizadas com sucesso.",
        variant: "success"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Formularios de captura</h2>
          <p className="text-sm text-slate-500">Edite campos, gere preview e acompanhe captacao com UTM.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{forms.length} formularios</Badge>
          <Button variant="secondary" onClick={createForm} disabled={creating}>
            <PlusCircle className="h-4 w-4" />
            {creating ? "Criando..." : "Novo formulario"}
          </Button>
          <Button onClick={saveForm} disabled={saving || !activeForm}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px,1fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista de formularios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {forms.map((form) => (
              <button
                key={form.id}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                  form.id === activeId ? "border-blue-300 bg-blue-50" : "border-blue-100 bg-white hover:bg-blue-50/60"
                }`}
                onClick={() => setActiveId(form.id)}
              >
                <p className="text-sm font-semibold text-slate-900">{form.title}</p>
                <p className="text-xs text-slate-500">{form.fields.filter((field) => field.enabled).length} campos ativos</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {activeForm ? (
          <FormBuilder
            form={activeForm}
            onChange={(next) =>
              setForms((current) => current.map((form) => (form.id === next.id ? cloneForm(next) : form)))
            }
          />
        ) : null}

        {activeForm ? <PublicFormPreview form={activeForm} /> : null}
      </div>

      {activeForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publicacao e rastreio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p className="inline-flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-600" />
              URL publica: <code className="rounded bg-blue-50 px-2 py-1 text-xs">{activeForm.publicUrl}</code>
            </p>
            <p>Captura de UTM: {activeForm.receivesUtm ? "Ativa" : "Desativada"}</p>
            <p>Anti-duplicidade por contato: {activeForm.antiDuplicate ? "Ativa" : "Desativada"}</p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
};
