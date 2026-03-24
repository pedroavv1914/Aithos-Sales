"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import type { DashboardMetrics } from "@/lib/types";

type DashboardViewProps = {
  workspaceId: string;
  metrics: DashboardMetrics;
  currentPeriod: "7d" | "30d" | "90d" | "custom";
  customFrom?: string;
  customTo?: string;
};

const percent = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);

export const DashboardView = ({
  workspaceId,
  metrics,
  currentPeriod,
  customFrom,
  customTo
}: DashboardViewProps) => {
  const [exporting, setExporting] = useState(false);

  const totalsByStage = metrics.leadsByStage.reduce((sum, item) => sum + item.total, 0);

  const exportCsv = async () => {
    setExporting(true);

    try {
      const response = await fetch(`/api/exports/leads?workspaceId=${workspaceId}`);
      if (!response.ok) {
        throw new Error();
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `leads-${workspaceId}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/app?period=7d" className="brand-button-secondary px-3 py-1">
            7d
          </Link>
          <Link href="/app?period=30d" className="brand-button-secondary px-3 py-1">
            30d
          </Link>
          <Link href="/app?period=90d" className="brand-button-secondary px-3 py-1">
            90d
          </Link>
          <Link href="/app?period=custom" className="brand-button-secondary px-3 py-1">
            Custom
          </Link>
        </div>
        <button type="button" className="brand-button" onClick={exportCsv}>
          <Download className="h-4 w-4" aria-hidden />
          {exporting ? "Gerando CSV..." : "Exportar CSV"}
        </button>
      </div>

      {currentPeriod === "custom" ? (
        <div className="surface-card p-4 text-sm text-muted">
          Periodo customizado: {customFrom || "-"} ate {customTo || "-"}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted">Leads hoje</p>
          <p className="mt-2 text-3xl font-bold">{metrics.leadsToday}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted">Conversao Novo→Ganho</p>
          <p className="mt-2 text-3xl font-bold">{metrics.conversionNovoToGanho.toFixed(1)}%</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted">1o contato medio</p>
          <p className="mt-2 text-3xl font-bold">{metrics.avgTimeToFirstContactHours.toFixed(1)}h</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted">Leads parados</p>
          <p className="mt-2 text-3xl font-bold">{metrics.stalledLeads}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted">Total no funil</p>
          <p className="mt-2 text-3xl font-bold">{totalsByStage}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
        <section className="surface-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Leads por semana (8 semanas)</h2>
          <div className="space-y-3">
            {metrics.weeklyLeads.map((item) => {
              const max = Math.max(...metrics.weeklyLeads.map((week) => week.total), 1);
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted">
                    <span>{item.label}</span>
                    <span>{item.total}</span>
                  </div>
                  <div className="h-3 rounded-full bg-[rgba(255,255,255,0.06)]">
                    <div
                      className="h-3 rounded-full bg-[color:var(--accent)]"
                      style={{ width: `${percent(item.total, max)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-5">
          <div className="surface-card p-5">
            <h2 className="mb-3 text-lg font-semibold">Leads por stage</h2>
            <div className="space-y-2">
              {metrics.leadsByStage.map((item) => (
                <div key={item.stageId} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{item.stageName}</span>
                  <span>{item.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="mb-3 text-lg font-semibold">Top 5 motivos de perda</h2>
            {metrics.topLossReasons.length === 0 ? (
              <p className="text-sm text-muted">Sem perdas registradas no periodo.</p>
            ) : (
              <div className="space-y-2">
                {metrics.topLossReasons.map((item) => (
                  <div key={item.reason} className="flex items-center justify-between text-sm">
                    <span className="text-muted">{item.reason}</span>
                    <span>{item.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
};
