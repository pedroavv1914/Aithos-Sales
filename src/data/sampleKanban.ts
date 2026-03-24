import type { SaleCard, Status } from "../types/kanban";

export const STATUS_ORDER: Status[] = ["lead", "negotiation", "closed"];

export const sampleCards: SaleCard[] = [
  {
    id: "card-001",
    client_name: "Nova Vertex",
    deal_value: 78000,
    priority: "high",
    status: "lead",
    last_contact: "2026-03-08",
    seller: { name: "Marina Costa", initials: "MC" },
  },
  {
    id: "card-002",
    client_name: "Alfa Finance",
    deal_value: 52000,
    priority: "medium",
    status: "lead",
    last_contact: "2026-03-10",
    seller: { name: "Pedro Lima", initials: "PL" },
  },
  {
    id: "card-003",
    client_name: "Zenith Cloud",
    deal_value: 134000,
    priority: "high",
    status: "negotiation",
    last_contact: "2026-03-11",
    seller: { name: "Aline Braga", initials: "AB" },
  },
  {
    id: "card-004",
    client_name: "Vesta Retail",
    deal_value: 46000,
    priority: "low",
    status: "negotiation",
    last_contact: "2026-03-06",
    seller: { name: "Rafael Dias", initials: "RD" },
  },
  {
    id: "card-005",
    client_name: "Orion Health",
    deal_value: 198000,
    priority: "high",
    status: "closed",
    last_contact: "2026-03-05",
    seller: { name: "Luisa Nunes", initials: "LN" },
  },
  {
    id: "card-006",
    client_name: "Atlas Logistics",
    deal_value: 91000,
    priority: "medium",
    status: "closed",
    last_contact: "2026-03-02",
    seller: { name: "Carlos Melo", initials: "CM" },
  },
];
