export type MemberRole = "owner" | "admin" | "member";

export type Priority = "low" | "medium" | "high";

export type LeadEventType =
  | "created"
  | "updated"
  | "stage_changed"
  | "note_added"
  | "task_created"
  | "task_completed"
  | "closed";

export type LeadTaskStatus = "pending" | "completed";

export type LeadCloseStatus = "won" | "lost";

export type LeadTag = "quente" | "urgente" | "alto-ticket" | string;

export type CaptureFieldKey =
  | "name"
  | "whatsapp"
  | "company"
  | "need"
  | "email"
  | "budget"
  | "deadline"
  | "notes";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  timezone: string;
  alertInactiveDays: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  userId: string;
  email: string;
  displayName: string;
  role: MemberRole;
  status: "active" | "invited";
  createdAt: string;
  updatedAt: string;
};

export type Pipeline = {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Stage = {
  id: string;
  workspaceId: string;
  name: string;
  order: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LeadTask = {
  id: string;
  leadId: string;
  title: string;
  dueAt: string;
  status: LeadTaskStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadEvent = {
  id: string;
  leadId: string;
  type: LeadEventType;
  createdBy: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type Lead = {
  id: string;
  workspaceId: string;
  name: string;
  phone: string;
  phoneNormalized: string;
  email?: string;
  emailNormalized?: string;
  company?: string;
  companyNormalized?: string;
  need?: string;
  score: number;
  budget?: number;
  deadline?: string;
  notes?: string;
  source?: string;
  priority: Priority;
  tags: LeadTag[];
  stageId: string;
  assignedTo?: string;
  hasPendingTask: boolean;
  lastContactAt?: string;
  closedAt?: string;
  closedReason?: string;
  status?: LeadCloseStatus;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type CaptureFormField = {
  key: CaptureFieldKey;
  label: string;
  enabled: boolean;
  required: boolean;
  placeholder?: string;
};

export type CaptureForm = {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  fields: CaptureFormField[];
  consentText: string;
  successMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type Invite = {
  id: string;
  workspaceId: string;
  email: string;
  role: MemberRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  body: string;
  href?: string;
  readAt?: string;
  createdAt: string;
};

export type PipelineFilters = {
  stageId?: string;
  source?: string;
  scoreMin?: number;
  scoreMax?: number;
  budgetMin?: number;
  budgetMax?: number;
  noFollowUpDays?: number;
  search?: string;
};

export type DateRangeFilter =
  | { preset: "7d" | "30d" | "90d" }
  | { preset: "custom"; from: string; to: string };

export type DashboardMetrics = {
  leadsToday: number;
  leadsByStage: Array<{ stageId: string; stageName: string; total: number }>;
  conversionNovoToGanho: number;
  avgTimeToFirstContactHours: number;
  stalledLeads: number;
  weeklyLeads: Array<{ label: string; total: number }>;
  topLossReasons: Array<{ reason: string; total: number }>;
};
