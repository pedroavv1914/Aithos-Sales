import type { CaptureFormField, MemberRole, Stage } from "@/lib/types";

export const INVITE_EXPIRATION_HOURS = 48;
export const PUBLIC_FORM_RATE_LIMIT_PER_HOUR = 5;

export const DEFAULT_ROLES: MemberRole[] = ["owner", "admin", "member"];

export const DEFAULT_STAGE_NAMES = [
  "Novo",
  "Contato",
  "Negociacao",
  "Ganho",
  "Perdido"
] as const;

export const DEFAULT_STAGES = (workspaceId: string): Stage[] =>
  DEFAULT_STAGE_NAMES.map((name, index) => ({
    id: `stage-${index + 1}`,
    workspaceId,
    name,
    order: index,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

export const DEFAULT_FORM_FIELDS: CaptureFormField[] = [
  { key: "name", label: "Nome", enabled: true, required: true, placeholder: "Seu nome" },
  {
    key: "whatsapp",
    label: "WhatsApp",
    enabled: true,
    required: true,
    placeholder: "(99) 99999-9999"
  },
  { key: "company", label: "Empresa", enabled: true, required: false, placeholder: "Empresa" },
  {
    key: "need",
    label: "Necessidade",
    enabled: true,
    required: true,
    placeholder: "Descreva a necessidade"
  },
  {
    key: "email",
    label: "E-mail",
    enabled: true,
    required: false,
    placeholder: "voce@empresa.com"
  },
  {
    key: "budget",
    label: "Orcamento",
    enabled: true,
    required: false,
    placeholder: "10000"
  },
  { key: "deadline", label: "Prazo", enabled: true, required: false, placeholder: "30 dias" },
  {
    key: "notes",
    label: "Observacoes",
    enabled: true,
    required: false,
    placeholder: "Mais detalhes"
  }
];

export const BRAND_COLORS = {
  bgDeep: "#050a14",
  accent: "#3b6ff0",
  accentBright: "#6b9dff",
  glassBg: "rgba(255,255,255,0.04)",
  textMuted: "#8b9bbf",
  error: "#f05a5a"
};
