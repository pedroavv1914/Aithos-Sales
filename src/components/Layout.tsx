import { Bell, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type LayoutProps = {
  children: ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[680px] -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="relative flex min-h-screen w-full gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:px-10 2xl:px-16">
          <aside className="hidden w-64 flex-col gap-6 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-sm backdrop-blur lg:flex">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                A
              </div>
              Aithos Sales
            </div>
            <nav className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <button className="rounded-xl bg-blue-50 px-3 py-2 text-left text-blue-700">
                Visao Geral
              </button>
              <button className="rounded-xl px-3 py-2 text-left transition hover:bg-slate-100">
                Pipeline
              </button>
              <button className="rounded-xl px-3 py-2 text-left transition hover:bg-slate-100">
                Metas
              </button>
              <button className="rounded-xl px-3 py-2 text-left transition hover:bg-slate-100">
                Relatorios
              </button>
            </nav>
            <div className="mt-auto rounded-2xl bg-blue-600 px-4 py-3 text-sm text-white shadow-sm">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" aria-hidden />
                Modo Premium
              </div>
              <p className="mt-2 text-xs text-blue-100">
                Ative insights avancados para deals quentes.
              </p>
            </div>
          </aside>

          <div className="flex flex-1 flex-col gap-6">
            <header className="flex flex-col gap-4 rounded-2xl border border-white/40 bg-white/70 px-5 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Sales Workspace
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                  Aithos Kanban
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
                  <Search className="h-4 w-4" aria-hidden />
                  <input
                    className="w-40 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Buscar deals"
                  />
                </label>
                <button
                  type="button"
                  className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-slate-700"
                  aria-label="Notificacoes"
                >
                  <Bell className="h-4 w-4" aria-hidden />
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
                </button>
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                    AC
                  </div>
                  Andre Costa
                </div>
              </div>
            </header>

            <main className="flex-1">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
};
