import type { DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Filter } from "lucide-react";
import { sampleCards } from "../data/sampleKanban";
import { useKanban } from "../hooks/useKanban";
import type { ColumnConfig, Status } from "../types/kanban";
import { SaleCard } from "./SaleCard";

const columns: ColumnConfig[] = [
  { id: "lead", label: "Leads", colorClass: "bg-blue-100 text-blue-700" },
  {
    id: "negotiation",
    label: "Em Negociacao",
    colorClass: "bg-amber-100 text-amber-700",
  },
  {
    id: "closed",
    label: "Venda Concluida",
    colorClass: "bg-emerald-100 text-emerald-700",
  },
];

export const KanbanBoard = () => {
  const {
    columns: columnData,
    activeCardId,
    overColumnId,
    handleDragStart,
    handleDragEnd,
    handleDragOverColumn,
    handleDrop,
    moveRelative,
  } = useKanban(sampleCards);

  const handleDragOver = (event: DragEvent<HTMLDivElement>, status: Status) => {
    event.preventDefault();
    handleDragOverColumn(status);
  };

  const handleDropOnColumn = (
    event: DragEvent<HTMLDivElement>,
    status: Status
  ) => {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain");
    if (cardId) {
      handleDrop(cardId, status);
    }
  };

  return (
    <section className="flex h-full w-full flex-col">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Pipeline</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            Kanban de Vendas Premium
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Acompanhe cada oportunidade com foco em prioridades e proximos passos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300"
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filtrar
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nova Oportunidade
          </button>
        </div>
      </div>

      <div className="flex h-full flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-6 xl:gap-8">
        {columns.map((column) => {
          const isOver = overColumnId === column.id;
          return (
            <div
              key={column.id}
              className={`flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white/60 p-4 backdrop-blur ${
                isOver ? "ring-2 ring-blue-500/30" : ""
              }`}
              onDragOver={(event) => handleDragOver(event, column.id)}
              onDrop={(event) => handleDropOnColumn(event, column.id)}
              aria-label={`Coluna ${column.label}`}
              role="region"
            >
              <div className="sticky top-4 z-10 flex items-center justify-between rounded-xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      column.colorClass
                    }`}
                  >
                    {column.label}
                  </span>
                  <span className="text-sm font-medium text-slate-600">
                    {columnData[column.id].length}
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  aria-label={`Adicionar lead na coluna ${column.label}`}
                >
                  +
                </button>
              </div>

              <motion.div
                layout
                className="mt-4 flex flex-1 flex-col gap-4"
                role="list"
                aria-label={`Cards da coluna ${column.label}`}
              >
                <AnimatePresence mode="popLayout">
                  {columnData[column.id].map((card) => (
                    <SaleCard
                      key={card.id}
                      card={card}
                      isActive={activeCardId === card.id}
                      onDragStart={(event, cardId, status) => {
                        event.dataTransfer.setData("text/plain", cardId);
                        event.dataTransfer.effectAllowed = "move";
                        handleDragStart(cardId, status);
                      }}
                      onDragEnd={handleDragEnd}
                      onMoveLeft={() => moveRelative(card.id, card.status, "prev")}
                      onMoveRight={() => moveRelative(card.id, card.status, "next")}
                    />
                  ))}
                </AnimatePresence>
                {columnData[column.id].length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-400">
                    Solte o card aqui
                  </div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
