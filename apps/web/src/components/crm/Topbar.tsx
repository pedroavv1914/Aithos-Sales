"use client";

import { Bell, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { GlobalSearch } from "@/components/crm/GlobalSearch";
import { QuickActionButtons } from "@/components/crm/QuickActionButtons";
import { Button } from "@/components/ui";
import type { Lead } from "@/types";

type TopbarProps = {
  userName: string;
  unreadNotifications: number;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  leads?: Lead[];
};

export const Topbar = ({ userName, unreadNotifications, theme, onThemeToggle, leads = [] }: TopbarProps) => {
  const [unread, setUnread] = useState(unreadNotifications);

  const handleBellClick = async () => {
    if (unread === 0) return;
    setUnread(0);
    await fetch("/api/notifications/read", { method: "PATCH" });
  };

  return (
    <header className="space-y-4 rounded-2xl border border-blue-100 bg-white/85 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sales workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Aithos CRM</h1>
          <p className="text-sm text-slate-500">Organize leads, follow-up e funil com ritmo comercial diario.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="icon" variant="secondary" onClick={onThemeToggle} aria-label="Alternar tema">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <button
            onClick={handleBellClick}
            className="relative rounded-xl border border-blue-200 bg-white p-2 hover:bg-blue-50 transition-colors"
            aria-label="Notificacoes"
          >
            <Bell className="h-4 w-4 text-slate-600" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-600 px-1 text-center text-[10px] font-bold text-white">
                {unread}
              </span>
            ) : null}
          </button>
          <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">{userName}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <GlobalSearch leads={leads} />
        <QuickActionButtons />
      </div>
    </header>
  );
};
