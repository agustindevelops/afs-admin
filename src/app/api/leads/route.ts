import {
  LeadSource,
  Prisma,
  UserRole,
  type AnswerType,
} from "@/generated/prisma/client";
import {
  type CreateLeadBody,
  isValidEmail,
  jsonError,
  leadDetailInclude,
  leadListInclude,
  normalizeEmail,
} from "@/lib/leads-api";
import { INITIAL_LEAD_STATUS_CODE, parseLeadSort } from "@/lib/lead-status";
import { leadListOrderBy } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

function scalarValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function validateTextAnswer(answerType: AnswerType, raw: string) {
  if (!raw) {
    return "This field is required";
  }
  if (answerType === "EMAIL" && !isValidEmail(normalizeEmail(raw))) {
    return "Enter a valid email";
  }
  if (answerType === "ZIP" && !/^\d{5}(-\d{4})?$/.test(raw)) {
    return "Enter a valid ZIP code";
  }
  if (answerType === "PHONE" && raw.replace(/\D/g, "").length < 10) {
    return "Enter a valid phone number";
  }
  return null;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

async function createLeadForUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip?: string;
  preferredCallTimeId?: number | null;
  flowId?: number | null;
  source: LeadSource;
  coverageType?: string | null;
  message?: string | null;
  answerRows?: {
    questionId: number;
    edgeId: number | null;
    value: Prisma.InputJsonValue;
  }[];
}) {
  const initialStatus = await prisma.leadStatus.findUnique({
    where: { code: INITIAL_LEAD_STATUS_CODE },
  });
  if (!initialStatus) {
    return { error: jsonError("UNSEEN lead status is not configured", 500) };
  }

  const lead = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: input.email },
      include: { profile: true },
    });

    const user =
      existing ??
      (await tx.user.create({
        data: {
          email: input.email,
          role: UserRole.CLIENT,
          profile: {
            create: {
              firstName: input.firstName,
              lastName: input.lastName,
              phone: input.phone,
              zip: input.zip || null,
            },
          },
        },
        include: { profile: true },
      }));

    if (existing) {
      await tx.profile.upsert({
        where: { userId: existing.id },
        update: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          ...(input.zip !== undefined ? { zip: input.zip || null } : {}),
        },
        create: {
          userId: existing.id,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          zip: input.zip || null,
        },
      });
    }

    return tx.lead.create({
      data: {
        userId: user.id,
        statusId: initialStatus.id,
        flowId: input.flowId ?? null,
        preferredCallTimeId: input.preferredCallTimeId ?? null,
        source: input.source,
        coverageType: input.coverageType ?? null,
        message: input.message ?? null,
        ...(input.answerRows?.length
          ? {
              answers: {
                create: input.answerRows,
              },
            }
          : {}),
      },
      include: leadDetailInclude,
    });
  });

  return { lead };
}

async function handleQuoteForm(body: CreateLeadBody & {
  coverageType?: string;
  message?: string;
  source?: string;
}) {
  const contact = body.contact ?? {};
  const fullName = String(
    (contact as { fullName?: string }).fullName ?? "",
  ).trim();
  let firstName = String(contact.firstName ?? "").trim();
  let lastName = String(contact.lastName ?? "").trim();
  if (fullName && (!firstName || !lastName)) {
    const split = splitFullName(fullName);
    firstName = firstName || split.firstName;
    lastName = lastName || split.lastName;
  }

  const email = normalizeEmail(String(contact.email ?? ""));
  const phone = String(contact.phone ?? "").trim();
  const zip = String((contact as { zip?: string }).zip ?? "").trim();
  const preferredCallTime = String(contact.preferredCallTime ?? "").trim();
  const coverageType = String(body.coverageType ?? "").trim();
  const message = String(body.message ?? "").trim() || null;

  if (!firstName || !lastName || !email) {
    return jsonError("Full name and email are required");
  }
  if (!isValidEmail(email)) {
    return jsonError("Enter a valid email");
  }
  if (phone.replace(/\D/g, "").length < 10) {
    return jsonError("Enter a valid phone number");
  }
  if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) {
    return jsonError("Enter a valid ZIP code");
  }
  if (!coverageType) {
    return jsonError("Coverage type is required");
  }

  let preferredCallTimeId: number | null = null;
  if (preferredCallTime) {
    const callTime = await prisma.preferredCallTime.findUnique({
      where: { code: preferredCallTime },
    });
    if (!callTime) {
      return jsonError("Unknown preferredCallTime");
    }
    preferredCallTimeId = callTime.id;
  }

  const result = await createLeadForUser({
    firstName,
    lastName,
    email,
    phone,
    zip: zip || undefined,
    preferredCallTimeId,
    source: LeadSource.QUOTE_FORM,
    coverageType,
    message,
  });

  if ("error" in result && result.error) return result.error;
  return Response.json({ lead: result.lead }, { status: 201 });
}

async function handleIntakeFlow(body: CreateLeadBody) {
  const flowSlug = String(body.flowSlug ?? "").trim() || "home-intake";
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const contact = body.contact ?? {};

  if (answers.length === 0) {
    return jsonError("At least one answer is required");
  }

  const firstName = String(contact.firstName ?? "").trim();
  const lastName = String(contact.lastName ?? "").trim();
  const email = normalizeEmail(String(contact.email ?? ""));
  const phone = String(contact.phone ?? "").trim();
  const preferredCallTime = String(contact.preferredCallTime ?? "").trim();

  if (!firstName || !lastName || !email) {
    return jsonError("firstName, lastName, and email are required");
  }
  if (!isValidEmail(email)) {
    return jsonError("Enter a valid email");
  }
  if (phone.replace(/\D/g, "").length < 10) {
    return jsonError("Enter a valid phone number");
  }
  if (!preferredCallTime) {
    return jsonError("preferredCallTime is required");
  }

  const callTime = await prisma.preferredCallTime.findUnique({
    where: { code: preferredCallTime },
  });
  if (!callTime) {
    return jsonError("Unknown preferredCallTime");
  }

  const flow = await prisma.intakeFlow.findUnique({
    where: { slug: flowSlug },
    include: {
      questions: {
        include: {
          edgesFrom: true,
        },
      },
    },
  });

  if (!flow) {
    return jsonError("Intake flow not found", 404);
  }

  const questionsByKey = new Map(
    flow.questions.map((question) => [question.key, question]),
  );

  const mapped: {
    coverageType?: string;
    message?: string;
  } = {};

  const answerRows: {
    questionId: number;
    edgeId: number | null;
    value: Prisma.InputJsonValue;
  }[] = [];

  for (const answer of answers) {
    const questionKey = String(answer.questionKey ?? "").trim();
    if (!questionKey) {
      return jsonError("Each answer needs a questionKey");
    }

    const question = questionsByKey.get(questionKey);
    if (!question) {
      return jsonError(`Unknown question: ${questionKey}`);
    }

    const choiceKey =
      answer.choiceKey != null ? String(answer.choiceKey).trim() : "";
    const edge = choiceKey
      ? question.edgesFrom.find((item) => item.choiceKey === choiceKey)
      : undefined;

    if (choiceKey && !edge) {
      return jsonError(`Invalid choice for ${questionKey}: ${choiceKey}`);
    }

    let value: Prisma.InputJsonValue;
    if (edge) {
      const textTypes = new Set([
        "TEXT",
        "EMAIL",
        "PHONE",
        "ZIP",
        "DATE",
        "CONSENT",
      ]);
      if (textTypes.has(question.answerType)) {
        const raw = scalarValue(answer.value);
        const allowEmpty = question.mapsToLeadField === "message";
        if (!allowEmpty) {
          const validationError = validateTextAnswer(question.answerType, raw);
          if (validationError) {
            return jsonError(`${questionKey}: ${validationError}`);
          }
        }
        value = raw;
      } else if (question.answerType === "BOOLEAN") {
        value = Boolean(answer.value);
      } else {
        value = {
          choiceKey: edge.choiceKey,
          label: edge.choiceLabel,
        };
      }
    } else {
      const raw = scalarValue(answer.value);
      const validationError = validateTextAnswer(question.answerType, raw);
      if (validationError) {
        return jsonError(`${questionKey}: ${validationError}`);
      }
      value = raw;
    }

    answerRows.push({
      questionId: question.id,
      edgeId: edge?.id ?? null,
      value,
    });

    const field = question.mapsToLeadField;
    if (field === "coverageType" && edge) {
      mapped.coverageType = edge.choiceKey;
    } else if (field === "message") {
      mapped.message = scalarValue(value) || undefined;
    }
  }

  const result = await createLeadForUser({
    firstName,
    lastName,
    email,
    phone,
    preferredCallTimeId: callTime.id,
    flowId: flow.id,
    source: LeadSource.INTAKE_FLOW,
    coverageType: mapped.coverageType,
    message: mapped.message ?? null,
    answerRows,
  });

  if ("error" in result && result.error) return result.error;
  return Response.json({ lead: result.lead }, { status: 201 });
}

export async function POST(request: Request) {
  let body: CreateLeadBody & {
    coverageType?: string;
    message?: string;
    source?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const source = String(body.source ?? "").trim().toUpperCase();
  if (source === "QUOTE_FORM") {
    return handleQuoteForm(body);
  }

  return handleIntakeFlow(body);
}

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const statusCode = searchParams.get("status") || undefined;
  const coverage = searchParams.get("coverage") || undefined;
  const source = searchParams.get("source") || undefined;
  const sort = parseLeadSort(searchParams.get("sort") ?? undefined);

  const where: Prisma.LeadWhereInput = {};
  if (statusCode && statusCode !== "ALL") {
    where.status = { code: statusCode };
  }
  if (coverage) {
    where.coverageType = coverage;
  }
  if (source) {
    where.source = source as LeadSource;
  }

  const leads = await prisma.lead.findMany({
    where,
    include: leadListInclude,
    orderBy: leadListOrderBy(sort),
  });

  return Response.json({ leads });
});
