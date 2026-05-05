import type {
  CaptureForm as LegacyCaptureForm,
  Lead as LegacyLead,
  LeadEvent as LegacyLeadEvent,
  LeadTask as LegacyLeadTask,
  Stage as LegacyStage
} from "@aithos/db";
import type { CaptureForm, Lead, LeadEvent, LeadStage, Tag, Task } from "@/types";

const tagToneMap = (label: string): Tag["tone"] => {
  const normalized = label.toLowerCase();
  if (normalized.includes("urg")) return "warning";
  if (normalized.includes("quente") || normalized.includes("hot")) return "hot";
  if (normalized.includes("ticket")) return "danger";
  if (normalized.includes("whatsapp")) return "success";
  return "default";
};

const toTag = (value: string): Tag => ({
  id: value.toLowerCase().replace(/\s+/g, "-"),
  label: value,
  tone: tagToneMap(value)
});

const normalizeStatus = (lead: LegacyLead): Lead["status"] => {
  if (lead.status === "won") return "won";
  if (lead.status === "lost") return "lost";
  return "open";
};

export const mapLegacyLead = (lead: LegacyLead, nextTaskAt?: string): Lead => ({
  id: lead.id,
  name: lead.name,
  company: lead.company,
  phone: lead.phone,
  email: lead.email,
  need: lead.need,
  budget: lead.budget,
  deadline: lead.deadline,
  notes: lead.notes,
  source: lead.source,
  priority: lead.priority,
  score: lead.score,
  tags: lead.tags.map(toTag),
  stageId: lead.stageId,
  status: normalizeStatus(lead),
  closedReason: lead.closedReason,
  lastInteractionAt: lead.lastContactAt,
  nextTaskAt,
  hasPendingTask: lead.hasPendingTask,
  assignedTo: lead.assignedTo,
  utm: lead.utm,
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt
});

export const mapLegacyStage = (stage: LegacyStage): LeadStage => ({
  id: stage.id,
  key: stage.name.toLowerCase(),
  name: stage.name,
  order: stage.order,
  isSystem: stage.isSystem
});

export const mapLegacyTask = (task: LegacyLeadTask): Task => ({
  id: task.id,
  leadId: task.leadId,
  title: task.title,
  dueAt: task.dueAt,
  status: task.status,
  assignee: undefined,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
});

export const mapLegacyEvent = (event: LegacyLeadEvent): LeadEvent => ({
  id: event.id,
  leadId: event.leadId,
  type: event.type,
  createdAt: event.createdAt,
  createdBy: event.createdBy,
  payload: event.payload
});

export const mapLegacyForm = (form: LegacyCaptureForm, workspaceSlug: string): CaptureForm => ({
  id: form.id,
  title: form.title,
  description: form.description,
  fields: form.fields.map((field, index) => ({
    id: `${form.id}-${field.key}-${index}`,
    key: field.key,
    label: field.label,
    enabled: field.enabled,
    required: field.required,
    placeholder: field.placeholder
  })),
  publicUrl: `/f/${workspaceSlug}/${form.id}`,
  receivesUtm: true,
  antiDuplicate: true,
  consentText: form.consentText,
  successMessage: form.successMessage,
  createdAt: form.createdAt,
  updatedAt: form.updatedAt
});
