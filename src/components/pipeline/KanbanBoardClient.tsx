"use client";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { Lead, Stage } from "@/lib/types";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";

type KanbanBoardClientProps = {
  workspaceId: string;
  stages: Stage[];
  leads: Lead[];
};

export const KanbanBoardClient = ({ workspaceId, stages, leads }: KanbanBoardClientProps) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <KanbanBoard workspaceId={workspaceId} stages={stages} leads={leads} />
    </DndProvider>
  );
};
