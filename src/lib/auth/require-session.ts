import "server-only";

import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export const requireSessionUser = async () => {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
};
