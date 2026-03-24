import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { InviteAcceptCard } from "@/components/auth/InviteAcceptCard";
import { getInviteByToken, getWorkspaceById } from "@/lib/services/workspaces";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentSessionUser();
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <section className="surface-elevated mx-auto mt-16 w-full max-w-xl p-6 text-center">
        <h1 className="text-2xl font-bold">Convite invalido</h1>
        <p className="mt-3 text-sm text-muted">Este token nao existe ou foi revogado.</p>
      </section>
    );
  }

  const workspace = await getWorkspaceById(invite.workspaceId);

  return (
    <InviteAcceptCard
      token={token}
      workspaceName={workspace?.name}
      requiresLogin={!user}
    />
  );
}
