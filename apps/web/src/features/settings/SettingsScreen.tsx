"use client";

import * as React from "react";
import { Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Switch, Textarea, useToast } from "@/components/ui";
import type { SettingsPayload } from "@/types";

type SettingsScreenProps = {
  workspaceId: string;
  payload: SettingsPayload;
};

export const SettingsScreen = ({ workspaceId, payload }: SettingsScreenProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const [followUpDays, setFollowUpDays] = React.useState(payload.followUpDays);
  const [savingPrefs, setSavingPrefs] = React.useState(false);
  const [brandingName, setBrandingName] = React.useState(payload.branding.appName);
  const [accentColor, setAccentColor] = React.useState(payload.branding.accentColor);
  const [tagDraft, setTagDraft] = React.useState("");
  const [tags, setTags] = React.useState(payload.tags);
  const [lossReasons, setLossReasons] = React.useState(payload.lossReasons.map((reason) => reason.reason).join("\n"));

  const addTag = () => {
    if (!tagDraft.trim()) return;
    setTags((current) => [...current, { id: tagDraft.toLowerCase().replace(/\s+/g, "-"), label: tagDraft.trim() }]);
    setTagDraft("");
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      const response = await fetch(`/api/settings/preferences?workspaceId=${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertInactiveDays: followUpDays })
      });

      if (!response.ok) {
        toast({ title: "Erro", description: "Falha ao salvar configuracoes.", variant: "destructive" });
        return;
      }

      toast({ title: "Preferencias salvas", description: "Configuracoes aplicadas.", variant: "success" });
      router.refresh();
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Configuracoes do CRM</h2>
        <p className="text-sm text-slate-500">Ajuste etapas, tags, motivos de perda e preferencias operacionais.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Etapas do funil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payload.stages.map((stage) => (
              <div key={stage.id} className="flex items-center justify-between rounded-xl border border-blue-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{stage.name}</p>
                  <p className="text-xs text-slate-500">Ordem: {stage.order + 1}</p>
                </div>
                <Badge variant={stage.isSystem ? "secondary" : "outline"}>{stage.isSystem ? "Sistema" : "Custom"}</Badge>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={async () => {
                const response = await fetch("/api/pipeline/stages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workspaceId, name: `Etapa ${payload.stages.length + 1}` })
                });
                if (!response.ok) {
                  toast({ title: "Erro", description: "Falha ao criar etapa.", variant: "destructive" });
                  return;
                }
                toast({ title: "Etapa criada", description: "Atualize a pagina para ver mudancas.", variant: "success" });
              }}
            >
              <Plus className="h-4 w-4" />
              Adicionar etapa
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tags e motivos de perda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Tags</Label>
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag.id}>{tag.label}</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="Nova tag" />
                <Button variant="secondary" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Motivos de perda (1 por linha)</Label>
              <Textarea value={lossReasons} onChange={(event) => setLossReasons(event.target.value)} className="min-h-[120px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferencias de follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Dias para marcar lead parado</Label>
            <Input type="number" min={1} value={String(followUpDays)} onChange={(event) => setFollowUpDays(Number(event.target.value))} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch defaultChecked />
              Alertar tarefas vencidas no dashboard
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding interno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Nome interno do CRM</Label>
              <Input value={brandingName} onChange={(event) => setBrandingName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cor de destaque</Label>
              <Input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
            </div>
            <Button onClick={savePreferences} disabled={savingPrefs}>
              <Save className="h-4 w-4" />
              {savingPrefs ? "Salvando..." : "Salvar configuracoes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
