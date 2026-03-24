import { Suspense } from "react";
import { AuthGateway } from "@/components/auth/AuthGateway";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Carregando cadastro...</div>}>
      <AuthGateway initialTab="signup" />
    </Suspense>
  );
}
