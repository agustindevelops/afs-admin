import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AnswerType,
  PrismaClient,
  QuestionOutcome,
  UserRole,
} from "../src/generated/prisma/client";
import {
  LEAD_STATUS_WORKFLOW,
  LEGACY_LEAD_STATUS_MAP,
} from "../src/lib/lead-status";

/**
 * Destructive seed. Only runs when ALLOW_DB_SEED=1 is set explicitly
 * (see `pnpm db:seed`). Not wired into migrate reset / deploy.
 */
if (process.env.ALLOW_DB_SEED !== "1") {
  console.error(
    [
      "Refusing to seed: ALLOW_DB_SEED is not set to 1.",
      "This script removes demo CLIENT users and rewrites reference data.",
      "It only creates the ADMIN user for dashboard access.",
      "Run only intentionally: pnpm db:seed",
    ].join("\n"),
  );
  process.exit(1);
}

if (
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production"
) {
  console.error(
    [
      "Refusing to seed against a production environment.",
      "Unset NODE_ENV/VERCEL_ENV production markers, or run against a non-prod DATABASE_URL locally.",
    ].join("\n"),
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type CoverageKey =
  | "under_65"
  | "turning_65"
  | "on_medicare"
  | "dental_vision"
  | "life"
  | "travel";

const HEALTH_MEDICARE_CONCERNS = [
  { key: "monthly_cost", label: "What it costs me each month" },
  { key: "doctors", label: "Keeping my doctors" },
  { key: "prescriptions", label: "What my prescriptions cost" },
  { key: "hospital_bill", label: "The bill that lands after a hospital stay" },
  { key: "family", label: "My family" },
] as const;

const DENTAL_VISION_CONCERNS = [
  { key: "monthly_cost", label: "What it costs me each month" },
  { key: "dentist", label: "Whether my dentist takes it" },
  { key: "eye_doctor", label: "Whether my eye doctor takes it" },
  { key: "waiting_period", label: "How soon I can use it" },
] as const;

const LIFE_CONCERNS = [
  { key: "monthly_cost", label: "What it costs me each month" },
  { key: "family_left", label: "What my family would be left with" },
  { key: "term_or_permanent", label: "Whether I need term or permanent" },
  { key: "how_much", label: "How much cover I actually need" },
] as const;

const COVERAGES: {
  key: CoverageKey;
  label: string;
  description: string;
  concernGroup: "health" | "medicare" | "dental_vision" | "life" | null;
}[] = [
  {
    key: "under_65",
    label: "I'm under 65 and buying my own coverage",
    description: "Health plans through the marketplace.",
    concernGroup: "health",
  },
  {
    key: "turning_65",
    label: "I will turn 65 within 12 months",
    description: "Medicare, before your window opens.",
    concernGroup: "medicare",
  },
  {
    key: "on_medicare",
    label: "I'm already on Medicare",
    description: "Review or change what you have.",
    concernGroup: "medicare",
  },
  {
    key: "dental_vision",
    label: "I want dental and/or vision",
    description: "Compare carriers and keep your providers.",
    concernGroup: "dental_vision",
  },
  {
    key: "life",
    label: "I want to protect my family",
    description: "Life insurance, and how much you need.",
    concernGroup: "life",
  },
  {
    key: "travel",
    label: "I'm traveling abroad / Study Abroad",
    description: "Cover that works past the border.",
    concernGroup: null,
  },
];

const PREFERRED_CALL_TIMES = [
  { code: "morning", label: "Morning", sortOrder: 1 },
  { code: "afternoon", label: "Afternoon", sortOrder: 2 },
  {
    code: "evening_weekend",
    label: "Evening / weekend by appointment",
    sortOrder: 3,
  },
] as const;

async function seedLeadStatuses() {
  for (const status of LEAD_STATUS_WORKFLOW) {
    await prisma.leadStatus.upsert({
      where: { code: status.code },
      update: {
        label: status.label,
        description: status.description,
        sortOrder: status.sortOrder,
      },
      create: status,
    });
  }

  for (const [legacyCode, nextCode] of Object.entries(LEGACY_LEAD_STATUS_MAP)) {
    const legacy = await prisma.leadStatus.findUnique({
      where: { code: legacyCode },
    });
    if (!legacy) continue;

    const next = await prisma.leadStatus.findUniqueOrThrow({
      where: { code: nextCode },
    });
    await prisma.lead.updateMany({
      where: { statusId: legacy.id },
      data: { statusId: next.id },
    });
    await prisma.leadStatus.delete({ where: { id: legacy.id } });
  }
}

async function seedPreferredCallTimes() {
  for (const option of PREFERRED_CALL_TIMES) {
    await prisma.preferredCallTime.upsert({
      where: { code: option.code },
      update: {
        label: option.label,
        sortOrder: option.sortOrder,
      },
      create: option,
    });
  }
}

async function seedIntakeFlow() {
  const flow = await prisma.intakeFlow.upsert({
    where: { slug: "home-intake" },
    update: {
      name: "Home intake",
      version: 1,
    },
    create: {
      slug: "home-intake",
      name: "Home intake",
      version: 1,
    },
  });

  await prisma.leadAnswer.deleteMany({
    where: { lead: { flowId: flow.id } },
  });
  await prisma.questionEdge.deleteMany({
    where: { fromQuestion: { flowId: flow.id } },
  });
  await prisma.question.deleteMany({ where: { flowId: flow.id } });

  const coverage = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "coverage",
      prompt: "How can we help you?",
      helpText: "Two quick questions, then your contact details.",
      answerType: AnswerType.SINGLE,
      mapsToLeadField: "coverageType",
      sortOrder: 1,
    },
  });

  const concernHealth = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "concern_health",
      prompt: "What worries you the most?",
      helpText: "Your answer helps us prepare — every option continues the same way.",
      answerType: AnswerType.SINGLE,
      sortOrder: 10,
    },
  });

  const concernMedicare = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "concern_medicare",
      prompt: "What worries you the most?",
      helpText: "Your answer helps us prepare — every option continues the same way.",
      answerType: AnswerType.SINGLE,
      sortOrder: 11,
    },
  });

  const concernDentalVision = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "concern_dental_vision",
      prompt: "What worries you the most?",
      helpText: "Your answer helps us prepare — every option continues the same way.",
      answerType: AnswerType.SINGLE,
      sortOrder: 12,
    },
  });

  const concernLife = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "concern_life",
      prompt: "What worries you the most?",
      helpText: "Your answer helps us prepare — every option continues the same way.",
      answerType: AnswerType.SINGLE,
      sortOrder: 13,
    },
  });

  const concernByGroup = {
    health: concernHealth,
    medicare: concernMedicare,
    dental_vision: concernDentalVision,
    life: concernLife,
  } as const;

  const concernsByGroup = {
    health: HEALTH_MEDICARE_CONCERNS,
    medicare: HEALTH_MEDICARE_CONCERNS,
    dental_vision: DENTAL_VISION_CONCERNS,
    life: LIFE_CONCERNS,
  } as const;

  for (const [coverageIndex, coverageOption] of COVERAGES.entries()) {
    const goesStraightToContact = coverageOption.concernGroup == null;

    await prisma.questionEdge.create({
      data: {
        fromQuestionId: coverage.id,
        toQuestionId: goesStraightToContact
          ? null
          : concernByGroup[coverageOption.concernGroup!].id,
        choiceKey: coverageOption.key,
        choiceLabel: coverageOption.label,
        choiceDescription: coverageOption.description,
        outcome: goesStraightToContact ? QuestionOutcome.COMPLETE : undefined,
        sortOrder: coverageIndex + 1,
      },
    });
  }

  for (const [group, concernQuestion] of Object.entries(concernByGroup)) {
    const concerns = concernsByGroup[group as keyof typeof concernsByGroup];
    for (const [concernIndex, concernOption] of concerns.entries()) {
      await prisma.questionEdge.create({
        data: {
          fromQuestionId: concernQuestion.id,
          toQuestionId: null,
          choiceKey: concernOption.key,
          choiceLabel: concernOption.label,
          outcome: QuestionOutcome.COMPLETE,
          sortOrder: concernIndex + 1,
        },
      });
    }
  }

  return flow;
}

/** Remove known demo CLIENT accounts only (not real portal leads). */
const DEMO_CLIENT_EMAILS = [
  "maria.garcia@example.com",
  "james.wilson@example.com",
] as const;

async function deleteDemoClientUsers() {
  const result = await prisma.user.deleteMany({
    where: {
      role: UserRole.CLIENT,
      email: { in: [...DEMO_CLIENT_EMAILS] },
    },
  });
  console.log(`Deleted ${result.count} demo CLIENT user(s).`);
}

async function seedAdminUser() {
  const email = "cc.aegisfs@gmail.com";
  const passwordHash = await hash("tempPassHHAISdev#1", 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      passwordHash,
    },
    create: {
      email,
      role: UserRole.ADMIN,
      passwordHash,
      profile: {
        create: {
          firstName: "Aegis",
          lastName: "Admin",
        },
      },
    },
  });
}

async function main() {
  await deleteDemoClientUsers();
  await seedLeadStatuses();
  await seedPreferredCallTimes();
  await seedIntakeFlow();
  await seedAdminUser();
  console.log(
    "Seed complete: demo CLIENT users removed; lead statuses, preferred call times, home-intake graph, admin user. CLIENT role remains for portal leads.",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
