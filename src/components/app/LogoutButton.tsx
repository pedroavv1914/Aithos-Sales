"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export const LogoutButton = () => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();

      if (supabase) {
        await supabase.auth.signOut();
      }

      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <button type="button" className="brand-button-secondary text-sm" onClick={handleLogout}>
      <LogOut className="h-4 w-4" aria-hidden />
      {pending ? "Saindo..." : "Sair"}
    </button>
  );
};
