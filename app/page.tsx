import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export default async function HomePage() {
  const user = await getCurrentSessionUser();

  if (user) {
    redirect("/app");
  }

  redirect("/login");
}
