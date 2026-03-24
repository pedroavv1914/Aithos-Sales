import type { DragEvent } from "react";
import { motion } from "framer-motion";
import { Calendar, CircleDollarSign, Flag } from "lucide-react";
import clsx from "clsx";
import type { SaleCard as SaleCardType, Status } from "../types/kanban";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
});

const priorityStyles: Record<SaleCardType["priority"], string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
};

const priorityLabel: Record<SaleCardType["priority"], string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
};

export type SaleCardProps = {
  card: SaleCardType;
  isActive: boolean;
  onDragStart: (
    event: DragEvent<HTMLElement>,
    cardId: string,
    status: Status
  ) => void;
  onDragEnd: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
};

export const SaleCard = ({
  card,
  isActive,
  onDragStart,
  onDragEnd,
  onMoveLeft,
  onMoveRight,
}: SaleCardProps) => {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      draggable
      role="listitem"
      onDragStartCapture={(event) => onDragStart(event, card.id, card.status)}
      onDragEndCapture={onDragEnd}
      className={clsx(
        "group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500/40",
        { "ring-2 ring-blue-500/40": isActive }
      )}
      tabIndex={0}
      aria-label={`Cliente ${card.client_name}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900 transition group-hover:text-slate-950">
            {card.client_name}
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <CircleDollarSign className="h-4 w-4 text-slate-400" aria-hidden />
            <span>{currencyFormatter.format(card.deal_value)}</span>
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
            priorityStyles[card.priority]
          }`}
        >
          {priorityLabel[card.priority]}
        </span>
      </header>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="h-4 w-4" aria-hidden />
          <span>
            {(() => {
              const date = new Date(card.last_contact);
              return isNaN(date.getTime())
                ? "Data invalida"
                : dateFormatter.format(date);
            })()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white transition group-hover:scale-105">
            {card.seller.initials}
          </div>
          <div className="text-xs text-slate-500">{card.seller.name}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4" aria-hidden />
          <span>Prioridade {priorityLabel[card.priority]}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMoveLeft}
            className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label="Mover para coluna anterior"
          >
            <span className="sr-only">Mover para coluna anterior</span>
            &larr;
          </button>
          <button
            type="button"
            onClick={onMoveRight}
            className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label="Mover para proxima coluna"
          >
            <span className="sr-only">Mover para proxima coluna</span>
            &rarr;
          </button>
        </div>
      </div>
    </motion.article>
  );
};
