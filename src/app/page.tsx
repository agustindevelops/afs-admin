import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";

export default async function Home() {
  await requireAdmin();
  redirect("/leads");
}
