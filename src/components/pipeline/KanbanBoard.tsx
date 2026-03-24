"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDrag, useDrop } from "react-dnd";
import { CalendarClock, Flag, GripVertical, MessageSquareWarning, Plus, Search } from "lucide-react";
import clsx from "clsx";
import type { Lead, Stage } from "@/lib/types";

type KanbanBoardProps = {
  workspaceId: string;
  stages: Stage[];
  leads: Lead[];
};

type DragItem = {
  leadId: string;
  fromStageId: string;
};

const priorityLabel: Record<Lead["priority"], string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta"
};

const daysWithoutContact = (lead: Lead) => {
  const base = lead.lastContactAt ? new Date(lead.lastContactAt) : new Date(lead.createdAt);
  return Math.max(0, Math.floor((Date.now() - base.getTime()) / (1000 * 60 * 60 * 24)));
};

const getStageToneClass = (stageName: string) => {
  const normalized = stageName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("novo")) return "app-stage-tone-novo";
  if (normalized.includes("contato")) return "app-stage-tone-contato";
  if (normalized.includes("negocia")) return "app-stage-tone-negociacao";
  if (normalized.includes("ganho")) return "app-stage-tone-ganho";
  if (normalized.includes("perdido")) return "app-stage-tone-perdido";

  return "app-stage-tone-default";
};

const LeadCard = ({
  lead,
  onMove,
  workspaceId
}: {
  lead: Lead;
  onMove: (leadId: string, toStageId: string, fromStageId: string) => Promise<void>;
  workspaceId: string;
}) => {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: "lead",
      item: {
        leadId: lead.id,
        fromStageId: lead.stageId
      } as DragItem,
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    }),
    [lead.id, lead.stageId]
  );

  const inactiveDays = daysWithoutContact(lead);

  return (
    <article
      ref={(node) => { dragRef(node); }}
      className={clsx(
        "app-lead-card group flex min-h-[220px] flex-col justify-between gap-4 rounded-2xl border border-[color:var(--brand-border)] bg-[linear-gradient(165deg,rgba(255,255,255,0.68),rgba(242,248,255,0.42)_55%,rgba(174,205,255,0.2))] p-4 shadow-[0_10px_22px_rgba(58,92,152,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(107,157,255,0.45)] hover:shadow-[0_14px_26px_rgba(58,92,152,0.18)]",
        { "scale-[0.98] opacity-60": isDragging }
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-[color:var(--text-primary)]">{lead.name}</p>
          <p className="text-sm text-muted">{lead.company || "Sem empresa"}</p>
        </div>
        <GripVertical className="h-4 w-4 text-muted" aria-hidden />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="brand-badge">
          <Flag className="mr-1 h-3 w-3" aria-hidden />
          {priorityLabel[lead.priority]}
        </span>
        {lead.hasPendingTask ? (
          <span className="brand-badge border-amber-400/30 bg-amber-500/15 text-amber-300">
            <MessageSquareWarning className="mr-1 h-3 w-3" aria-hidden />
            Tarefa pendente
          </span>
        ) : null}
      </div>

      <div className="app-lead-meta rounded-xl px-3 py-2 text-xs text-muted">
        {inactiveDays} dia(s) sem contato
        {lead.budget ? ` | Orcamento: R$ ${lead.budget.toLocaleString("pt-BR")}` : ""}
      </div>

      <div className="mt-auto flex items-center justify-between">
        <Link
          href={`/app/leads/${lead.id}`}
          className="text-sm font-medium text-[color:var(--accent-bright)] hover:text-[color:var(--accent)] hover:underline"
        >
          Ver detalhes
        </Link>
        <button
          type="button"
          className="brand-button-secondary px-2 py-1 text-xs"
          onClick={() => onMove(lead.id, lead.stageId, lead.stageId)}
        >
          <CalendarClock className="h-3 w-3" aria-hidden />
          Atualizar
        </button>
      </div>
    </article>
  );
};

const StageColumn = ({
  stage,
  leads,
  stageToneClass,
  onDropLead,
  children
}: {
  stage: Stage;
  leads: Lead[];
  stageToneClass: string;
  onDropLead: (item: DragItem, toStageId: string) => Promise<void>;
  children: ReactNode;
}) => {
  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: "lead",
      drop: async (item: DragItem) => {
        await onDropLead(item, stage.id);
      },
      canDrop: (item: DragItem) => item.fromStageId !== stage.id,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop()
      })
    }),
    [stage.id, onDropLead]
  );

  return (
    <section
      ref={(node) => { dropRef(node); }}
      className={clsx(
        "app-stage-column surface-card flex min-h-[520px] flex-col p-4",
        stageToneClass,
        isOver && canDrop ? "ring-2 ring-[color:var(--brand-ring)]" : ""
      )}
    >
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[color:var(--accent-bright)]">
          {stage.name}
        </h3>
        <span className="app-stage-count rounded-full px-2 py-1 text-xs text-muted">
          {leads.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </section>
  );
};

export const KanbanBoard = ({ workspaceId, stages, leads }: KanbanBoardProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [boardLeads, setBoardLeads] = useState(leads);
  const [boardStages, setBoardStages] = useState(stages);
  const [newStageName, setNewStageName] = useState("");

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [noFollowUpDays, setNoFollowUpDays] = useState("");

  const visibleLeads = useMemo(() => {
    return boardLeads.filter((lead) => {
      if (stageFilter !== "all" && lead.stageId !== stageFilter) {
        return false;
      }

      if (sourceFilter !== "all" && (lead.source || "") !== sourceFilter) {
        return false;
      }

      if (budgetMin && (lead.budget ?? 0) < Number(budgetMin)) {
        return false;
      }

      if (budgetMax && (lead.budget ?? 0) > Number(budgetMax)) {
        return false;
      }

      if (scoreMin && lead.score < Number(scoreMin)) {
        return false;
      }

      if (noFollowUpDays && daysWithoutContact(lead) < Number(noFollowUpDays)) {
        return false;
      }

      if (search.trim()) {
        const haystack = `${lead.name} ${lead.phone} ${lead.company ?? ""}`.toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [boardLeads, budgetMax, budgetMin, noFollowUpDays, scoreMin, search, sourceFilter, stageFilter]);

  const sources = useMemo(() => {
    return Array.from(new Set(boardLeads.map((lead) => lead.source).filter(Boolean))) as string[];
  }, [boardLeads]);

  const moveLead = async (leadId: string, toStageId: string, fromStageId: string) => {
    if (toStageId === fromStageId) {
      return;
    }

    const previous = boardLeads;
    setBoardLeads((current) =>
      current.map((lead) => (lead.id === leadId ? { ...lead, stageId: toStageId } : lead))
    );

    try {
      const response = await fetch("/api/pipeline/stage-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          leadId,
          fromStageId,
          toStageId
        })
      });

      if (!response.ok) {
        throw new Error();
      }

      router.refresh();
    } catch {
      setBoardLeads(previous);
    }
  };

  const createStage = async () => {
    if (!newStageName.trim()) {
      return;
    }

    const response = await fetch("/api/pipeline/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        name: newStageName
      })
    });

    if (response.ok) {
      setNewStageName("");
      router.refresh();
    }
  };

  const rename = async (stage: Stage) => {
    const name = window.prompt("Novo nome do stage", stage.name);
    if (!name || name.trim().length < 2) {
      return;
    }

    const response = await fetch("/api/pipeline/stages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rename",
        workspaceId,
        stageId: stage.id,
        name: name.trim()
      })
    });

    if (response.ok) {
      router.refresh();
    }
  };

  const reorder = async (stageId: string, direction: "left" | "right") => {
    const currentIndex = boardStages.findIndex((stage) => stage.id === stageId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= boardStages.length) {
      return;
    }

    const copy = [...boardStages];
    const [stage] = copy.splice(currentIndex, 1);
    copy.splice(targetIndex, 0, stage);

    setBoardStages(copy.map((item, idx) => ({ ...item, order: idx })));

    const response = await fetch("/api/pipeline/stages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        workspaceId,
        orderedIds: copy.map((item) => item.id)
      })
    });

    if (response.ok) {
      router.refresh();
    }
  };

  const remove = async (stage: Stage) => {
    if (stage.isSystem) {
      return;
    }

    if (!window.confirm("Remover stage e mover leads para o proximo disponivel?")) {
      return;
    }

    const response = await fetch("/api/pipeline/stages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, stageId: stage.id })
    });

    if (response.ok) {
      router.refresh();
    }
  };

  return (
    <section className="space-y-5">
      <div className="surface-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            className="brand-input"
            placeholder="Busca global por nome, telefone ou empresa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <select className="brand-input" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">Todos stages</option>
            {boardStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>

          <select
            className="brand-input"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">Todas fontes</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <input
            className="brand-input"
            placeholder="Orcamento min"
            value={budgetMin}
            onChange={(event) => setBudgetMin(event.target.value)}
          />
          <input
            className="brand-input"
            placeholder="Orcamento max"
            value={budgetMax}
            onChange={(event) => setBudgetMax(event.target.value)}
          />
          <input
            className="brand-input"
            placeholder="Score min"
            value={scoreMin}
            onChange={(event) => setScoreMin(event.target.value)}
          />
          <input
            className="brand-input"
            placeholder="Sem follow-up ha X dias"
            value={noFollowUpDays}
            onChange={(event) => setNoFollowUpDays(event.target.value)}
          />
        </div>
      </div>

      <div className="surface-card p-4">
        <p className="mb-2 text-sm text-muted">Gestao de stages</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="brand-input max-w-xs"
            placeholder="Novo stage"
            value={newStageName}
            onChange={(event) => setNewStageName(event.target.value)}
          />
          <button type="button" className="brand-button" onClick={createStage}>
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar stage
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {boardStages
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((stage) => {
            const stageLeads = visibleLeads.filter((lead) => lead.stageId === stage.id);
            const stageToneClass = getStageToneClass(stage.name);
            return (
              <div key={stage.id} className="space-y-2">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="brand-button-secondary px-2 py-1 text-xs"
                    onClick={() => rename(stage)}
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    className="brand-button-secondary px-2 py-1 text-xs"
                    onClick={() => reorder(stage.id, "left")}
                  >
                    ?
                  </button>
                  <button
                    type="button"
                    className="brand-button-secondary px-2 py-1 text-xs"
                    onClick={() => reorder(stage.id, "right")}
                  >
                    ?
                  </button>
                  {!stage.isSystem ? (
                    <button
                      type="button"
                      className="brand-button-secondary px-2 py-1 text-xs"
                      onClick={() => remove(stage)}
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
                <StageColumn
                  stage={stage}
                  leads={stageLeads}
                  stageToneClass={stageToneClass}
                  onDropLead={(item, toStageId) => moveLead(item.leadId, toStageId, item.fromStageId)}
                >
                  {stageLeads.length === 0 ? (
                    <div className="app-dropzone flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-[color:var(--brand-border)] text-sm text-muted">
                      Solte leads aqui
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        workspaceId={workspaceId}
                        onMove={moveLead}
                      />
                    ))
                  )}
                </StageColumn>
              </div>
            );
          })}
      </div>

      {isPending ? <p className="text-sm text-muted">Sincronizando mudancas...</p> : null}
    </section>
  );
};


