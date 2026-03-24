import "server-only";

import { getCurrentSessionUser } from "@/lib/auth/current-user";

export class ApiAuthError extends Error {}

export const requireApiSessionUser = async () => {
  const user = await getCurrentSessionUser();

  if (!user) {
    throw new ApiAuthError("Sessao invalida");
  }

  return user;
};
