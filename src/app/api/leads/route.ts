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

export async function POST(request: Request) {
  let body: CreateLeadBody;
  try {
    body = (await request.json()) as CreateLeadBody;
  } catch {
    return jsonError("Invalid JSON body");
  }

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

  const newStatus = await prisma.leadStatus.findUnique({
    where: { code: "NEW" },
  });
  if (!newStatus) {
    return jsonError("NEW lead status is not configured", 500);
  }

  const lead = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    const user =
      existing ??
      (await tx.user.create({
        data: {
          email,
          role: UserRole.CLIENT,
          profile: {
            create: {
              firstName,
              lastName,
              phone,
            },
          },
        },
        include: { profile: true },
      }));

    if (existing) {
      await tx.profile.upsert({
        where: { userId: existing.id },
        update: {
          firstName,
          lastName,
          phone,
        },
        create: {
          userId: existing.id,
          firstName,
          lastName,
          phone,
        },
      });
    }

    const created = await tx.lead.create({
      data: {
        userId: user.id,
        statusId: newStatus.id,
        flowId: flow.id,
        preferredCallTimeId: callTime.id,
        source: LeadSource.INTAKE_FLOW,
        coverageType: mapped.coverageType,
        message: mapped.message ?? null,
        answers: {
          create: answerRows,
        },
      },
      include: leadDetailInclude,
    });

    return created;
  });

  return Response.json({ lead }, { status: 201 });
}

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const statusCode = searchParams.get("status") || undefined;
  const coverage = searchParams.get("coverage") || undefined;
  const source = searchParams.get("source") || undefined;

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
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ leads });
});
