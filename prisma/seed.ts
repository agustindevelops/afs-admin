import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AnswerType,
  LeadSource,
  PrismaClient,
  QuestionOutcome,
  UserRole,
} from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const LEAD_STATUSES = [
  {
    code: "NEW",
    label: "New",
    description: "Lead was just created / submitted",
  },
  {
    code: "CONTACTED",
    label: "Contacted",
    description: "Initial outreach has been made",
  },
  {
    code: "ENGAGED",
    label: "Engaged",
    description: "Lead has responded or shown interest",
  },
  {
    code: "QUALIFIED",
    label: "Qualified",
    description: "Lead is a legitimate potential customer",
  },
  {
    code: "NURTURING",
    label: "Nurturing",
    description: "Interested, but not ready to move forward yet",
  },
  {
    code: "UNQUALIFIED",
    label: "Unqualified",
    description: "Not a good fit / does not meet requirements",
  },
  {
    code: "CONVERTED",
    label: "Converted",
    description: "Lead became a client/customer",
  },
  {
    code: "LOST",
    label: "Lost",
    description: "Qualified lead decided not to proceed",
  },
] as const;

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
  for (const status of LEAD_STATUSES) {
    await prisma.leadStatus.upsert({
      where: { code: status.code },
      update: {
        label: status.label,
        description: status.description,
      },
      create: status,
    });
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

async function seedDemoLeads() {
  const newStatus = await prisma.leadStatus.findUniqueOrThrow({
    where: { code: "NEW" },
  });
  const contactedStatus = await prisma.leadStatus.findUniqueOrThrow({
    where: { code: "CONTACTED" },
  });
  const morningCallTime = await prisma.preferredCallTime.findUniqueOrThrow({
    where: { code: "morning" },
  });
  const flow = await prisma.intakeFlow.findUniqueOrThrow({
    where: { slug: "home-intake" },
  });

  const coverageQuestion = await prisma.question.findUniqueOrThrow({
    where: { flowId_key: { flowId: flow.id, key: "coverage" } },
  });
  const concernQuestion = await prisma.question.findUniqueOrThrow({
    where: { flowId_key: { flowId: flow.id, key: "concern_health" } },
  });

  const coverageEdge = await prisma.questionEdge.findUniqueOrThrow({
    where: {
      fromQuestionId_choiceKey: {
        fromQuestionId: coverageQuestion.id,
        choiceKey: "under_65",
      },
    },
  });
  const concernEdge = await prisma.questionEdge.findUniqueOrThrow({
    where: {
      fromQuestionId_choiceKey: {
        fromQuestionId: concernQuestion.id,
        choiceKey: "monthly_cost",
      },
    },
  });

  const maria = await prisma.user.upsert({
    where: { email: "maria.garcia@example.com" },
    update: {},
    create: {
      email: "maria.garcia@example.com",
      role: UserRole.CLIENT,
      profile: {
        create: {
          firstName: "Maria",
          lastName: "Garcia",
          phone: "(210) 555-0142",
          zip: "78251",
        },
      },
    },
  });

  const james = await prisma.user.upsert({
    where: { email: "james.wilson@example.com" },
    update: {},
    create: {
      email: "james.wilson@example.com",
      role: UserRole.CLIENT,
      profile: {
        create: {
          firstName: "James",
          lastName: "Wilson",
          phone: "(305) 555-0198",
          zip: "33101",
        },
      },
    },
  });

  await prisma.lead.deleteMany({
    where: { userId: { in: [maria.id, james.id] } },
  });

  const lead = await prisma.lead.create({
    data: {
      userId: maria.id,
      statusId: newStatus.id,
      flowId: flow.id,
      preferredCallTimeId: morningCallTime.id,
      source: LeadSource.INTAKE_FLOW,
      coverageType: "under_65",
      message: "Looking for a lower premium for my family of four.",
    },
  });

  await prisma.leadAnswer.createMany({
    data: [
      {
        leadId: lead.id,
        questionId: coverageQuestion.id,
        edgeId: coverageEdge.id,
        value: { choiceKey: "under_65", label: coverageEdge.choiceLabel },
      },
      {
        leadId: lead.id,
        questionId: concernQuestion.id,
        edgeId: concernEdge.id,
        value: { choiceKey: "monthly_cost", label: concernEdge.choiceLabel },
      },
    ],
  });

  await prisma.lead.create({
    data: {
      userId: maria.id,
      statusId: contactedStatus.id,
      source: LeadSource.QUOTE_FORM,
      coverageType: "dental_vision",
      message: "Earlier quote request for dental only.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    },
  });

  await prisma.lead.create({
    data: {
      userId: james.id,
      statusId: newStatus.id,
      source: LeadSource.QUOTE_FORM,
      coverageType: "on_medicare",
      message: "Turning 66 next month, want a plan review.",
    },
  });
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
  await seedLeadStatuses();
  await seedPreferredCallTimes();
  await seedIntakeFlow();
  await seedDemoLeads();
  await seedAdminUser();
  console.log(
    "Seed complete: lead statuses, preferred call times, home-intake graph, demo leads, admin user.",
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
