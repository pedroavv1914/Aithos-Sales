"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle, Plus, Tag, XCircle } from "lucide-react";
import type { Lead, LeadEvent, LeadTask } from "@/lib/types";

type LeadDetailsProps = {
  workspaceId: string;
  lead: Lead;
  tasks: LeadTask[];
  events: LeadEvent[];
  nextCursor: string | null;
};

const eventLabel: Record<LeadEvent["type"], string> = {
  created: "Lead criado",
  stage_changed: "Stage alterado",
  note_added: "Nota adicionada",
  task_created: "Tarefa criada",
  task_completed: "Tarefa concluida",
  closed: "Lead fechado"
};

export const LeadDetails = ({ workspaceId, lead, tasks, events, nextCursor }: LeadDetailsProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [timeline, setTimeline] = useState(events);
  const [timelineCursor, setTimelineCursor] = useState(nextCursor);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const whatsappLink = useMemo(() => {
    const number = lead.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Ola ${lead.name}, tudo bem? Estou entrando em contato sobre ${lead.need || "sua necessidade"}...`
    );
    return `https://wa.me/55${number}?text=${message}`;
  }, [lead.name, lead.need, lead.phone]);

  const submitNote = async () => {
    if (!note.trim()) {
      return;
    }

    const response = await fetch(`/api/leads/${lead.id}/notes?workspaceId=${workspaceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note })
    });

    if (response.ok) {
      setNote("");
      router.refresh();
    }
  };

  const submitTask = async () => {
    if (!taskTitle.trim() || !taskDueAt) {
      return;
    }

    const response = await fetch(`/api/leads/${lead.id}/tasks?workspaceId=${workspaceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, dueAt: taskDueAt })
    });

    if (response.ok) {
      setTaskTitle("");
      setTaskDueAt("");
      router.refresh();
    }
  };

  const completeTask = async (taskId: string) => {
    const response = await fetch(
      `/api/leads/${lead.id}/tasks/${taskId}/complete?workspaceId=${workspaceId}`,
      {
        method: "POST"
      }
    );

    if (response.ok) {
      router.refresh();
    }
  };

  const saveTags = async (tags: string[]) => {
    const response = await fetch(`/api/leads/${lead.id}/tags?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags })
    });

    if (response.ok) {
      router.refresh();
    }
  };

  const addTag = async () => {
    if (!tagInput.trim()) {
      return;
    }

    const tags = Array.from(new Set([...(lead.tags ?? []), tagInput.trim()]));
    await saveTags(tags);
    setTagInput("");
  };

  const removeTag = async (tag: string) => {
    const tags = (lead.tags ?? []).filter((item) => item !== tag);
    await saveTags(tags);
  };

  const closeLead = async (status: "won" | "lost") => {
    if (!closeReason.trim()) {
      return;
    }

    const response = await fetch(`/api/leads/${lead.id}/close?workspaceId=${workspaceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason: closeReason })
    });

    if (response.ok) {
      setCloseReason("");
      router.refresh();
    }
  };

  const loadMoreTimeline = async () => {
    if (!timelineCursor) {
      return;
    }

    setLoadingTimeline(true);

    try {
      const response = await fetch(
        `/api/leads/${lead.id}/events?workspaceId=${workspaceId}&cursor=${encodeURIComponent(
          timelineCursor
        )}`
      );

      const data = (await response.json()) as { events: LeadEvent[]; nextCursor: string | null };

      if (response.ok) {
        setTimeline((current) => [...current, ...data.events]);
        setTimelineCursor(data.nextCursor);
      }
    } finally {
      setLoadingTimeline(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
      <section className="surface-card space-y-4 p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">{lead.name}</h2>
            <p className="text-muted">{lead.company || "Sem empresa"}</p>
          </div>
          <a href={whatsappLink} target="_blank" rel="noreferrer" className="brand-button">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Abrir no WhatsApp
          </a>
        </header>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="surface-elevated p-3 text-sm">
            <p className="text-muted">E-mail</p>
            <p>{lead.email || "-"}</p>
          </div>
          <div className="surface-elevated p-3 text-sm">
            <p className="text-muted">Telefone</p>
            <p>{lead.phone}</p>
          </div>
          <div className="surface-elevated p-3 text-sm">
            <p className="text-muted">Necessidade</p>
            <p>{lead.need || "-"}</p>
          </div>
          <div className="surface-elevated p-3 text-sm">
            <p className="text-muted">Stage</p>
            <p>{lead.stageId}</p>
          </div>
        </div>

        <div className="surface-elevated p-4">
          <p className="mb-2 text-sm font-semibold">Adicionar nota</p>
          <textarea
            className="brand-input min-h-20"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Resumo da conversa"
          />
          <button type="button" className="brand-button mt-3" onClick={() => startTransition(submitNote)}>
            Salvar nota
          </button>
        </div>

        <div className="surface-elevated p-4">
          <p className="mb-2 text-sm font-semibold">Criar tarefa</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="brand-input"
              placeholder="Titulo"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
            />
            <input
              className="brand-input"
              type="datetime-local"
              value={taskDueAt}
              onChange={(event) => setTaskDueAt(event.target.value)}
            />
          </div>
          <button type="button" className="brand-button mt-3" onClick={() => startTransition(submitTask)}>
            Criar tarefa
          </button>

          <div className="mt-3 space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-[color:var(--brand-border)] px-3 py-2"
              >
                <div>
                  <p className="text-sm text-[color:var(--text-primary)]">{task.title}</p>
                  <p className="text-xs text-muted">Vence em {new Date(task.dueAt).toLocaleString("pt-BR")}</p>
                </div>
                {task.status === "pending" ? (
                  <button
                    type="button"
                    className="brand-button-secondary text-xs"
                    onClick={() => startTransition(() => completeTask(task.id))}
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    Concluir
                  </button>
                ) : (
                  <span className="text-xs text-emerald-300">Concluida</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="surface-card p-5">
          <p className="mb-2 text-sm font-semibold">Tags</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {lead.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="brand-badge"
                onClick={() => startTransition(() => removeTag(tag))}
              >
                <Tag className="mr-1 h-3 w-3" aria-hidden />
                {tag}
                <XCircle className="ml-1 h-3 w-3" aria-hidden />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="brand-input"
              placeholder="Nova tag"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
            />
            <button type="button" className="brand-button" onClick={() => startTransition(addTag)}>
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </section>

        <section className="surface-card p-5">
          <p className="mb-2 text-sm font-semibold">Fechar lead</p>
          <textarea
            className="brand-input min-h-20"
            value={closeReason}
            onChange={(event) => setCloseReason(event.target.value)}
            placeholder="Motivo"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="brand-button"
              onClick={() => startTransition(() => closeLead("won"))}
            >
              Ganho
            </button>
            <button
              type="button"
              className="brand-button-secondary"
              onClick={() => startTransition(() => closeLead("lost"))}
            >
              Perdido
            </button>
          </div>
        </section>

        <section className="surface-card p-5">
          <p className="mb-3 text-sm font-semibold">Timeline</p>
          <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
            {timeline.map((event) => (
              <article key={event.id} className="rounded-lg border border-[color:var(--brand-border)] p-3">
                <p className="text-sm font-medium text-[color:var(--text-primary)]">
                  {eventLabel[event.type]}
                </p>
                <p className="text-xs text-muted">{new Date(event.createdAt).toLocaleString("pt-BR")}</p>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-muted">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </article>
            ))}
          </div>
          {timelineCursor ? (
            <button
              type="button"
              className="brand-button-secondary mt-3 w-full"
              onClick={loadMoreTimeline}
              disabled={loadingTimeline}
            >
              {loadingTimeline ? "Carregando..." : "Carregar mais"}
            </button>
          ) : null}
        </section>
      </aside>

      {isPending ? <p className="text-sm text-muted">Sincronizando...</p> : null}
    </div>
  );
};
