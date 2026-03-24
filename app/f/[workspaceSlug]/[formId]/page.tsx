import { notFound } from "next/navigation";
import { PublicLeadForm } from "@/components/forms/PublicLeadForm";
import { getCaptureFormBySlugAndId } from "@/lib/services/forms";

export const dynamic = "force-dynamic";

export default async function PublicCapturePage({
  params,
  searchParams
}: {
  params: Promise<{ workspaceSlug: string; formId: string }>;
  searchParams: Promise<{
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  }>;
}) {
  const { workspaceSlug, formId } = await params;
  const query = await searchParams;
  const data = await getCaptureFormBySlugAndId(workspaceSlug, formId);

  if (!data) {
    notFound();
  }

  return (
    <div className="px-4 py-10">
      <PublicLeadForm
        workspaceSlug={workspaceSlug}
        formId={formId}
        form={data.form}
        utm={{
          source: query.utm_source,
          medium: query.utm_medium,
          campaign: query.utm_campaign,
          term: query.utm_term,
          content: query.utm_content
        }}
      />
    </div>
  );
}
