import { prisma } from "@/lib/prisma";
import { jsonError, leadDetailInclude } from "@/lib/leads-api";
import { withAuth } from "@/lib/with-auth";

type RouteContext = { params: Promise<{ id: string }> };

function parseLeadId(id: string) {
  const leadId = Number(id);
  return Number.isFinite(leadId) ? leadId : null;
}

export const GET = withAuth(async (_request, context) => {
  const { id } = await context.params;
  const leadId = parseLeadId(id);
  if (leadId == null) {
    return jsonError("Invalid lead id", 400);
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: leadDetailInclude,
  });

  if (!lead) {
    return jsonError("Lead not found", 404);
  }

  return Response.json({ lead });
});

export const PATCH = withAuth(async (request, context) => {
  const { id } = await context.params;
  const leadId = parseLeadId(id);
  if (leadId == null) {
    return jsonError("Invalid lead id", 400);
  }

  let body: { statusCode?: string };
  try {
    body = (await request.json()) as { statusCode?: string };
  } catch {
    return jsonError("Invalid JSON body");
  }

  const statusCode = String(body.statusCode ?? "").trim();
  if (!statusCode) {
    return jsonError("statusCode is required");
  }

  const status = await prisma.leadStatus.findUnique({
    where: { code: statusCode },
  });
  if (!status) {
    return jsonError("Unknown status code", 400);
  }

  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) {
    return jsonError("Lead not found", 404);
  }

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { statusId: status.id },
    include: leadDetailInclude,
  });

  return Response.json({ lead });
});

export const DELETE = withAuth(async (_request, context) => {
  const { id } = await context.params;
  const leadId = parseLeadId(id);
  if (leadId == null) {
    return jsonError("Invalid lead id", 400);
  }

  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) {
    return jsonError("Lead not found", 404);
  }

  await prisma.lead.delete({ where: { id: leadId } });

  return Response.json({ ok: true });
});
