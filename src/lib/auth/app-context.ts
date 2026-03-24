import "server-only";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getUnreadNotificationCount } from "@/lib/services/notifications";
import { getUserWorkspaceMemberships } from "@/lib/services/workspaces";

export const getCurrentAppContext = async () => {
  const user = await getCurrentSessionUser();

  if (!user) {
    return {
      user: null,
      workspace: null,
      membership: null,
      unreadNotifications: 0
    };
  }

  const memberships = await getUserWorkspaceMemberships(user.uid);
  const primary = memberships[0] ?? null;

  const unreadNotifications = primary
    ? await getUnreadNotificationCount(primary.workspace.id, user.uid)
    : 0;

  return {
    user,
    workspace: primary?.workspace ?? null,
    membership: primary?.member ?? null,
    unreadNotifications
  };
};
