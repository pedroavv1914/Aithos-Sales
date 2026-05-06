export type PriorityLevel = "low" | "medium" | "high";
export type LeadStatus = "open" | "won" | "lost";
export type LeadStageKey = "novo" | "contato" | "negociacao" | "ganho" | "perdido" | string;
export type TaskStatus = "pending" | "completed";
export type TaskBucket = "overdue" | "today" | "upcoming";
export type LeadEventKind =
  | "created"
  | "updated"
  | "stage_changed"
  | "note_added"
  | "task_created"
  | "task_completed"
  | "closed";

export type SortDirection = "asc" | "desc";
export type LeadsSortField = "recent" | "priority" | "lastInteraction";

export interface UTMSource {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface Tag {
  id: string;
  label: string;
  tone?: "default" | "hot" | "warning" | "success" | "danger";
}

export interface LeadStage {
  id: string;
  key: LeadStageKey;
  name: string;
  order: number;
  isSystem: boolean;
}

export interface Task {
  id: string;
  leadId: string;
  title: string;
  dueAt: string;
  status: TaskStatus;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadEvent {
  id: string;
  leadId: string;
  type: LeadEventKind;
  createdAt: string;
  createdBy: string;
  payload: Record<string, unknown>;
}

export interface Lead {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  need?: string;
  budget?: number;
  deadline?: string;
  notes?: string;
  source?: string;
  priority: PriorityLevel;
  score: number;
  tags: Tag[];
  stageId: string;
  status: LeadStatus;
  closedReason?: string;
  lastInteractionAt?: string;
  nextTaskAt?: string;
  hasPendingTask: boolean;
  assignedTo?: string;
  utm?: UTMSource;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineColumn {
  id: string;
  name: string;
  order: number;
  stageId: string;
  count: number;
  leads: Lead[];
  isSystem: boolean;
}

export interface LossReason {
  id: string;
  reason: string;
  total: number;
  percentage: number;
}

export interface Metric {
  id: string;
  label: string;
  value: string;
  helper?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    label: string;
  };
}

export interface DashboardData {
  metrics: Metric[];
  lossReasons: LossReason[];
  overdueTasks: Task[];
  leadsWithoutFollowUp: Lead[];
  funnelSummary: Array<{ stageId: string; stageName: string; total: number }>;
  conversionByStage: Array<{ stageName: string; conversion: number }>;
}

export interface CaptureFormField {
  id: string;
  key: "name" | "whatsapp" | "company" | "need" | "email" | "budget" | "deadline" | "notes";
  label: string;
  enabled: boolean;
  required: boolean;
  placeholder?: string;
}

export interface CaptureForm {
  id: string;
  title: string;
  description?: string;
  fields: CaptureFormField[];
  publicUrl: string;
  receivesUtm: boolean;
  antiDuplicate: boolean;
  consentText: string;
  successMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsFilterState {
  query: string;
  stageId: string;
  source: string;
  priority: "all" | PriorityLevel;
  budgetRange: "all" | "0-2000" | "2000-10000" | "10000+";
  noFollowUpDays: number;
  sortBy: LeadsSortField;
  sortDirection: SortDirection;
}

export interface TasksFilterState {
  status: "all" | TaskStatus;
  leadId: "all" | string;
  assignee: "all" | string;
}

export interface MetricsFilterState {
  period: "7d" | "30d" | "90d";
  source: "all" | string;
}

export interface ExportFilterState {
  stageId: "all" | string;
  status: "all" | LeadStatus;
  source: "all" | string;
  includeCustomFields: boolean;
  format: "csv" | "xlsx" | "json";
}

export interface CRMSettingsData {
  stages: LeadStage[];
  tags: Tag[];
  lossReasons: LossReason[];
  followUpDays: number;
  branding: {
    appName: string;
    accentColor: string;
  };
}

export type DashboardPayload = DashboardData;
export type LeadsPayload = {
  leads: Lead[];
  stages: LeadStage[];
  sources: string[];
  tags: Tag[];
  members: Array<{ userId: string; displayName: string }>;
};
export type PipelinePayload = { stages: LeadStage[]; columns: PipelineColumn[] };
export type LeadDetailsPayload = {
  lead: Lead;
  tasks: Task[];
  events: LeadEvent[];
  stages: LeadStage[];
  members: Array<{ userId: string; displayName: string }>;
};
export type TasksPayload = {
  tasks: Task[];
  leads: Lead[];
};
export type FormsPayload = {
  forms: CaptureForm[];
};
export type MetricsPayload = {
  lossReasons: LossReason[];
  conversionByStage: Array<{ stageName: string; conversion: number }>;
  leadsBySource: Array<{ source: string; total: number }>;
  gainsVsLosses: Array<{ period: string; ganhos: number; perdidos: number }>;
  avgFirstContactHours: number;
};
export type SettingsPayload = CRMSettingsData;
