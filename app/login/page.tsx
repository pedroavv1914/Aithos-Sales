import { Suspense } from "react";
import { AuthGateway } from "@/components/auth/AuthGateway";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Carregando login...</div>}>
      <AuthGateway initialTab="login" />
    </Suspense>
  );
}
