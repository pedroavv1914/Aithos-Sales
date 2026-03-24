"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, Moon, PanelRight, Settings, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { LogoutButton } from "@/components/app/LogoutButton";

type AppShellProps = {
  children: ReactNode;
  userName: string;
  workspaceName?: string;
  unreadNotifications: number;
};

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/pipeline", label: "Pipeline", icon: PanelRight },
  { href: "/app/settings", label: "Configuracoes", icon: Settings }
];

const THEME_STORAGE_KEY = "aithos-app-theme";

export const AppShell = ({ children, userName, workspaceName, unreadNotifications }: AppShellProps) => {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const appThemeRoot = document.querySelector(".app-theme");
    if (!appThemeRoot) {
      return;
    }

    appThemeRoot.classList.toggle("theme-dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="relative min-h-screen px-4 pb-8 pt-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 lg:flex-row">
        <aside className="surface-card app-sidebar w-full p-5 lg:w-72 lg:self-start lg:sticky lg:top-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent)] font-bold text-white">
              A
            </div>
            <div>
              <p className="font-semibold text-[color:var(--text-primary)]">Aithos Sales</p>
              <p className="text-xs text-muted">{workspaceName ?? "Sem workspace"}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx("app-nav-link brand-button-secondary justify-start border-transparent text-sm", {
                  "is-active": pathname === item.href || pathname.startsWith(`${item.href}/`)
                })}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="app-workspace-card mt-6 rounded-xl border border-[color:var(--brand-border)] bg-[rgba(59,111,240,0.12)] p-3">
            <p className="text-sm font-semibold text-[color:var(--accent-bright)]">Workspace ativo</p>
            <p className="mt-1 text-xs text-muted">Alinhado com os modulos M1-M7 e pronto para deploy.</p>
          </div>
        </aside>

        <div className="flex-1">
          <header className="surface-card app-topbar mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Sales Workspace</p>
              <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Aithos CRM</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="app-theme-toggle brand-button-secondary border-[color:var(--brand-border)] px-3 py-2 text-sm"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
                title={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" aria-hidden />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden />
                )}
                <span className="hidden sm:inline">{theme === "dark" ? "Escuro" : "Claro"}</span>
              </button>
              <div className="app-bell-wrap relative rounded-full border border-[color:var(--brand-border)] bg-[rgba(255,255,255,0.03)] p-2">
                <Bell className="h-4 w-4 text-[color:var(--text-primary)]" aria-hidden />
                {unreadNotifications > 0 ? (
                  <span className="app-counter absolute -right-1 -top-1 min-w-5 rounded-full bg-[color:var(--accent)] px-1 text-center text-[10px] font-bold text-white">
                    {unreadNotifications}
                  </span>
                ) : null}
              </div>
              <div className="rounded-full border border-[color:var(--brand-border)] px-3 py-2 text-sm text-muted">
                {userName}
              </div>
              <LogoutButton />
            </div>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
};
