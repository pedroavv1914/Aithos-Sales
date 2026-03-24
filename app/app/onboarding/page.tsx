import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/app/OnboardingForm";
import { getCurrentAppContext } from "@/lib/auth/app-context";

export default async function OnboardingPage() {
  const context = await getCurrentAppContext();

  if (!context.user) {
    redirect("/login");
  }

  if (context.workspace) {
    redirect("/app");
  }

  return <OnboardingForm />;
}
