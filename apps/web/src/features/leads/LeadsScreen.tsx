"use client";

import Link from "next/link";
import { MessageCircle, MoveRight, NotebookPen } from "lucide-react";
import * as React from "react";
import { EmptyState, LeadCard, LeadFilters, NewLeadDialog } from "@/components/crm";
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { useLeadFilters } from "@/hooks/use-lead-filters";
import { useMobile } from "@/hooks/use-mobile";
import type { LeadsPayload } from "@/types";

type LeadsScreenProps = {
  workspaceId: string;
  payload: LeadsPayload;
};

export const LeadsScreen = ({ workspaceId, payload }: LeadsScreenProps) => {
  const { filters, setFilters, filteredLeads } = useLeadFilters(payload.leads);
  const isMobile = useMobile();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Leads</h2>
          <p className="text-sm text-slate-500">Busca, filtros avancados e acoes rapidas para operacao comercial.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{filteredLeads.length} resultados</Badge>
          <NewLeadDialog workspaceId={workspaceId} stages={payload.stages} />
        </div>
      </div>

      <LeadFilters filters={filters} setFilters={setFilters} stages={payload.stages} sources={payload.sources} />

      {filteredLeads.length === 0 ? (
        <EmptyState
          title="Nenhum lead encontrado"
          description="Ajuste filtros ou adicione novos leads para iniciar o acompanhamento."
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Ultima interacao</TableHead>
              <TableHead>Proxima tarefa</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <p className="font-semibold text-slate-900">{lead.name}</p>
                  <p className="text-xs text-slate-500">{lead.company ?? "Sem empresa"}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {payload.stages.find((stage) => stage.id === lead.stageId)?.name ?? "Sem etapa"}
                  </Badge>
                </TableCell>
                <TableCell>{lead.source ?? "-"}</TableCell>
                <TableCell className="capitalize">{lead.priority}</TableCell>
                <TableCell>{new Date(lead.lastInteractionAt ?? lead.createdAt).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{lead.nextTaskAt ? new Date(lead.nextTaskAt).toLocaleString("pt-BR") : "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/app/leads/${lead.id}`}>
                      <Button size="sm" variant="secondary">
                        <MoveRight className="h-3.5 w-3.5" />
                        Abrir
                      </Button>
                    </Link>
                    <a
                      href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-200 px-2 text-blue-700 hover:bg-blue-50"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                    <button className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-200 px-2 text-blue-700 hover:bg-blue-50">
                      <NotebookPen className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
};
