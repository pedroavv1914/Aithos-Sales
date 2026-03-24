import { z } from "zod";

export const whatsappSchema = z
  .string()
  .regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Use o formato (99) 99999-9999");

export const emailSchema = z.string().email("Informe um e-mail valido");

export const captureSubmitSchema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  whatsapp: whatsappSchema,
  company: z.string().optional(),
  need: z.string().min(2, "Informe a necessidade"),
  email: z.string().email("Informe um e-mail valido").optional().or(z.literal("")),
  budget: z.number().optional(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Consentimento obrigatorio" }) })
});

export const inviteCreateSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "member"])
});

export const onboardingSchema = z.object({
  workspaceName: z.string().min(2, "Informe o nome do workspace"),
  timezone: z.string().min(2)
});

export const noteSchema = z.object({
  note: z.string().min(2, "A nota deve ter ao menos 2 caracteres")
});

export const taskSchema = z.object({
  title: z.string().min(2, "Titulo obrigatorio"),
  dueAt: z.string().min(5, "Data e hora obrigatorias")
});

export const stageMoveSchema = z.object({
  workspaceId: z.string().min(1),
  leadId: z.string().min(1),
  fromStageId: z.string().min(1),
  toStageId: z.string().min(1)
});
