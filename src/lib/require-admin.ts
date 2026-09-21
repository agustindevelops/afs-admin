import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Session check for admin pages and server actions.
 * Uses the same `auth()` read as the login page, so production secure
 * cookies and local cookies stay in agreement.
 * https://nextjs.org/docs/app/guides/authentication#creating-a-data-access-layer-dal
 */
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }
  return session;
}
