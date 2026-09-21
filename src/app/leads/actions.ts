"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function updateLeadStatus(formData: FormData) {
  const leadId = Number(formData.get("leadId"));
  const statusCode = String(formData.get("statusCode") ?? "");

  if (!Number.isFinite(leadId) || !statusCode) {
    redirect(`/leads/${leadId}?error=1`);
  }

  const status = await prisma.leadStatus.findUnique({
    where: { code: statusCode },
  });

  if (!status) {
    redirect(`/leads/${leadId}?error=1`);
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { statusId: status.id },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  redirect(`/leads/${leadId}`);
}
