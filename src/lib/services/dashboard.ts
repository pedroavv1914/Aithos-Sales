import "server-only";

import { endOfDay, format, startOfDay, subDays } from "date-fns";
import type { DashboardMetrics, DateRangeFilter, Lead } from "@/lib/types";
import { listLeads, listStages } from "@/lib/services/leads";

const parseRange = (range: DateRangeFilter) => {
  if (range.preset === "custom") {
    return {
      from: startOfDay(new Date(range.from)),
      to: endOfDay(new Date(range.to))
    };
  }

  const days = range.preset === "7d" ? 7 : range.preset === "30d" ? 30 : 90;
  return {
    from: startOfDay(subDays(new Date(), days)),
    to: endOfDay(new Date())
  };
};

export const getDashboardMetrics = async (
  workspaceId: string,
  range: DateRangeFilter = { preset: "30d" }
): Promise<DashboardMetrics> => {
  const [stages, leads] = await Promise.all([listStages(workspaceId), listLeads(workspaceId)]);
  const { from, to } = parseRange(range);

  const inRange = leads.filter((lead) => {
    const createdAt = new Date(lead.createdAt);
    return createdAt >= from && createdAt <= to;
  });

  const leadsToday = leads.filter((lead) => {
    const createdAt = new Date(lead.createdAt);
    return createdAt >= startOfDay(new Date()) && createdAt <= endOfDay(new Date());
  }).length;

  const leadsByStage = stages.map((stage) => ({
    stageId: stage.id,
    stageName: stage.name,
    total: leads.filter((lead) => lead.stageId === stage.id).length
  }));

  const novoStage = stages.find((stage) => stage.name.toLowerCase() === "novo") ?? stages[0];
  const ganhoStage =
    stages.find((stage) => stage.name.toLowerCase() === "ganho") ?? stages[stages.length - 1];

  const totalNovo = leads.filter((lead) => lead.stageId === novoStage?.id).length;
  const totalGanho = leads.filter((lead) => lead.stageId === ganhoStage?.id).length;
  const conversionNovoToGanho = totalNovo > 0 ? (totalGanho / totalNovo) * 100 : 0;

  const withFirstContact = leads
    .filter((lead) => lead.lastContactAt)
    .map((lead) => {
      const created = new Date(lead.createdAt).getTime();
      const firstContact = new Date(lead.lastContactAt as string).getTime();
      return (firstContact - created) / (1000 * 60 * 60);
    })
    .filter((hours) => hours >= 0);

  const avgTimeToFirstContactHours =
    withFirstContact.length > 0
      ? withFirstContact.reduce((sum, value) => sum + value, 0) / withFirstContact.length
      : 0;

  const stalledLeads = leads.filter((lead) => {
    const pivot = lead.lastContactAt ? new Date(lead.lastContactAt) : new Date(lead.createdAt);
    return Date.now() - pivot.getTime() > 1000 * 60 * 60 * 24 * 3;
  }).length;

  const weeklyLeads = Array.from({ length: 8 }).map((_, index) => {
    const weekEnd = endOfDay(subDays(new Date(), index * 7));
    const weekStart = startOfDay(subDays(weekEnd, 6));

    const total = leads.filter((lead) => {
      const created = new Date(lead.createdAt);
      return created >= weekStart && created <= weekEnd;
    }).length;

    return {
      label: format(weekStart, "dd/MM"),
      total
    };
  });

  const lossMap = new Map<string, number>();
  leads
    .filter((lead) => lead.status === "lost" && lead.closedReason)
    .forEach((lead) => {
      const reason = lead.closedReason as string;
      lossMap.set(reason, (lossMap.get(reason) ?? 0) + 1);
    });

  const topLossReasons = [...lossMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, total]) => ({ reason, total }));

  return {
    leadsToday,
    leadsByStage,
    conversionNovoToGanho,
    avgTimeToFirstContactHours,
    stalledLeads,
    weeklyLeads: weeklyLeads.reverse(),
    topLossReasons
  };
};

export const mapLeadsToCsvRows = (leads: Lead[]) => {
  return leads.map((lead) => ({
    id: lead.id,
    nome: lead.name,
    empresa: lead.company ?? "",
    telefone: lead.phone,
    email: lead.email ?? "",
    stage: lead.stageId,
    score: lead.score,
    tags: lead.tags.join("|"),
    source: lead.source ?? "",
    utm_medium: lead.utm?.medium ?? "",
    utm_campaign: lead.utm?.campaign ?? "",
    closedReason: lead.closedReason ?? "",
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    closedAt: lead.closedAt ?? "",
    assignedTo: lead.assignedTo ?? ""
  }));
};
