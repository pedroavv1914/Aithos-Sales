"use client";

import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { Filter, Search } from "lucide-react";
import * as React from "react";
import { KanbanColumn, LeadCard, LeadDrawer, NewLeadDialog } from "@/components/crm";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from "@/components/ui";
import type { Lead, PipelineColumn, PipelinePayload } from "@/types";

type PipelineScreenProps = {
  workspaceId: string;
  payload: PipelinePayload;
};

const findColumnByLead = (columns: PipelineColumn[], leadId: string) =>
  columns.find((column) => column.leads.some((lead) => lead.id === leadId));

const SortableLead = ({ lead, onClick }: { lead: Lead; onClick: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-70" : ""} {...attributes} {...listeners}>
      <LeadCard lead={lead} compact showActions={false} onClick={onClick} />
    </div>
  );
};

export const PipelineScreen = ({ workspaceId, payload }: PipelineScreenProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const { toast } = useToast();
  const [columns, setColumns] = React.useState(payload.columns);
  const [query, setQuery] = React.useState("");
  const [source, setSource] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [drawerLead, setDrawerLead] = React.useState<Lead | null>(null);

  const sources = React.useMemo(() => {
    const list = columns.flatMap((column) => column.leads.map((lead) => lead.source).filter(Boolean));
    return Array.from(new Set(list)) as string[];
  }, [columns]);

  const visibleColumns = React.useMemo(() => {
    return columns.map((column) => {
      const leads = column.leads.filter((lead) => {
        if (source !== "all" && lead.source !== source) return false;
        if (priority !== "all" && lead.priority !== priority) return false;
        if (query.trim()) {
          const haystack = `${lead.name} ${lead.company ?? ""}`.toLowerCase();
          return haystack.includes(query.toLowerCase());
        }
        return true;
      });
      return {
        ...column,
        leads,
        count: leads.length
      };
    });
  }, [columns, priority, query, source]);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeLeadId = String(active.id);
    const overId = String(over.id);
    const fromColumn = findColumnByLead(columns, activeLeadId);
    if (!fromColumn) return;

    const overColumn = columns.find((column) => column.stageId === overId) ?? findColumnByLead(columns, overId);
    if (!overColumn) return;

    if (fromColumn.stageId === overColumn.stageId) {
      const activeIndex = fromColumn.leads.findIndex((lead) => lead.id === activeLeadId);
      const overIndex = fromColumn.leads.findIndex((lead) => lead.id === overId);
      if (activeIndex === -1 || overIndex === -1) return;

      setColumns((current) =>
        current.map((column) =>
          column.stageId === fromColumn.stageId
            ? {
                ...column,
                leads: arrayMove(column.leads, activeIndex, overIndex)
              }
            : column
        )
      );
      return;
    }

    const lead = fromColumn.leads.find((item) => item.id === activeLeadId);
    if (!lead) return;

    setColumns((current) => {
      const next = current.map((column) => ({ ...column, leads: [...column.leads] }));
      const from = next.find((column) => column.stageId === fromColumn.stageId)!;
      const to = next.find((column) => column.stageId === overColumn.stageId)!;
      from.leads = from.leads.filter((item) => item.id !== lead.id);
      to.leads.unshift({ ...lead, stageId: to.stageId });
      return next.map((column) => ({ ...column, count: column.leads.length }));
    });

    const response = await fetch("/api/pipeline/stage-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        leadId: lead.id,
        fromStageId: fromColumn.stageId,
        toStageId: overColumn.stageId
      })
    });

    if (!response.ok) {
      setColumns(payload.columns);
      toast({
        title: "Falha ao mover lead",
        description: "Nao foi possivel sincronizar com o backend.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Lead movido",
      description: `${lead.name} agora esta em ${overColumn.name}.`,
      variant: "success"
    });
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Funil Kanban</h2>
            <p className="text-sm text-slate-500">Drag and drop com alertas de urgencia e leitura rapida.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Filter className="h-3.5 w-3.5" />
              {visibleColumns.reduce((sum, column) => sum + column.count, 0)} leads visiveis
            </span>
            <NewLeadDialog workspaceId={workspaceId} stages={payload.stages} />
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lead ou empresa" className="pl-9" />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              {sources.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="grid gap-4 xl:grid-cols-5">
          {visibleColumns
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((column) => (
              <KanbanColumn key={column.stageId} column={column}>
                <SortableContext items={column.leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
                  {column.leads.map((lead) => (
                    <SortableLead key={lead.id} lead={lead} onClick={() => setDrawerLead(lead)} />
                  ))}
                </SortableContext>
              </KanbanColumn>
            ))}
        </div>
      </DndContext>

      <LeadDrawer
        open={Boolean(drawerLead)}
        onOpenChange={(open) => !open && setDrawerLead(null)}
        lead={drawerLead}
        tasks={[]}
        events={[]}
      />
    </section>
  );
};
