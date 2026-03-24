export type Priority = "low" | "medium" | "high";
export type Status = "lead" | "negotiation" | "closed";

export type SaleCard = {
  id: string;
  client_name: string;
  deal_value: number;
  priority: Priority;
  status: Status;
  last_contact: string;
  seller: {
    name: string;
    initials: string;
  };
};

export type ColumnConfig = {
  id: Status;
  label: string;
  colorClass: string;
};
