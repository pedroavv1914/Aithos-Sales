import type { Metadata } from "next";
import "@/index.css";
import "@/components/AuthScreen.css";

export const metadata: Metadata = {
  title: "Aithos Sales CRM",
  description: "CRM comercial com funil, captura publica e automacoes"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-grain" aria-hidden />
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}
