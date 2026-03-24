import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getCurrentAppContext } from "@/lib/auth/app-context";
import { getDashboardMetrics } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

const getPeriod = (value: string | undefined) => {
  if (value === "7d" || value === "30d" || value === "90d" || value === "custom") {
    return value;
  }

  return "30d";
};

export default async function AppDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const context = await getCurrentAppContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!context.workspace) {
    redirect("/app/onboarding");
  }

  const params = await searchParams;
  const period = getPeriod(params.period);

  const metrics =
    period === "custom" && params.from && params.to
      ? await getDashboardMetrics(context.workspace.id, {
          preset: "custom",
          from: params.from,
          to: params.to
        })
      : await getDashboardMetrics(context.workspace.id, { preset: period as "7d" | "30d" | "90d" });

  return (
    <DashboardView
      workspaceId={context.workspace.id}
      metrics={metrics}
      currentPeriod={period}
      customFrom={params.from}
      customTo={params.to}
    />
  );
}
