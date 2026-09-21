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
  | "no_medicare_yet"
  | "on_medicare"
  | "dental_vision"
  | "life"
  | "mortgage"
  | "funeral"
  | "travel"
  | "something_else";

const COVERAGES: {
  key: CoverageKey;
  label: string;
  description: string;
  concerns: { key: string; label: string }[];
  channels: {
    key: string;
    label: string;
    description: string;
    outcome?: QuestionOutcome;
    toAgent?: boolean;
  }[];
}[] = [
  {
    key: "under_65",
    label: "I'm under 65",
    description: "Individual & family health through the marketplace.",
    concerns: [
      { key: "cost", label: "Premiums or deductibles feel too high" },
      { key: "doctors", label: "I need to keep my doctors" },
      { key: "lost_coverage", label: "I lost coverage and need to enroll" },
      { key: "compare", label: "I want to compare plans before I decide" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description:
          "Answer a few questions and we call you with options that fit.",
        toAgent: true,
      },
      {
        key: "self_enroll",
        label: "Apply on my own",
        description: "Go to the marketplace enrollment tool.",
        outcome: QuestionOutcome.REDIRECT,
      },
    ],
  },
  {
    key: "turning_65",
    label: "I will be turning 65 within 6 months",
    description: "Medicare, before your window opens.",
    concerns: [
      { key: "when_to_enroll", label: "I'm not sure when to enroll" },
      { key: "parts", label: "I don't understand Parts A, B, C, and D" },
      { key: "penalties", label: "I want to avoid late enrollment penalties" },
      { key: "compare", label: "I want to compare Advantage and Supplemental" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description: "Share your details and sign your Scope of Appointment.",
        toAgent: true,
      },
      {
        key: "self_enroll",
        label: "Apply on my own",
        description: "Compare plans and enroll yourself.",
        outcome: QuestionOutcome.REDIRECT,
      },
    ],
  },
  {
    key: "no_medicare_yet",
    label: "I'm 65 or older but I don't have Medicare yet",
    description: "Get enrolled and understand your options.",
    concerns: [
      { key: "start_now", label: "I need to get Medicare started" },
      { key: "still_working", label: "I'm still working and have other coverage" },
      { key: "spouse", label: "I'm helping a spouse enroll" },
      { key: "confused", label: "I'm overwhelmed and need guidance" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description: "We walk you through enrollment and plan choices.",
        toAgent: true,
      },
      {
        key: "self_enroll",
        label: "Apply on my own",
        description: "Use the Medicare enrollment tools yourself.",
        outcome: QuestionOutcome.REDIRECT,
      },
    ],
  },
  {
    key: "on_medicare",
    label: "I'm already on Medicare but want a plan change",
    description: "Review or change what you have.",
    concerns: [
      { key: "costs", label: "My costs went up" },
      { key: "doctors", label: "My doctors or pharmacy changed" },
      { key: "drugs", label: "My prescriptions aren't covered well" },
      { key: "annual", label: "I want an annual plan review" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description: "Scope of Appointment first, then we compare options.",
        toAgent: true,
      },
      {
        key: "self_enroll",
        label: "Apply on my own",
        description: "Enter doctors and medications, then compare plans.",
        outcome: QuestionOutcome.REDIRECT,
      },
    ],
  },
  {
    key: "dental_vision",
    label: "I want dental or vision",
    description: "Compare carriers and keep your providers.",
    concerns: [
      { key: "dentist", label: "I need my dentist in-network" },
      { key: "eye", label: "I need my eye doctor in-network" },
      { key: "both", label: "I want both dental and vision" },
      { key: "price", label: "I want the most affordable option" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description: "Tell us which providers you want to keep.",
        toAgent: true,
      },
      {
        key: "self_enroll",
        label: "Apply on my own",
        description: "Compare dental and vision plans yourself.",
        outcome: QuestionOutcome.REDIRECT,
      },
    ],
  },
  {
    key: "life",
    label: "I want life insurance",
    description: "Term, permanent, and how much you need.",
    concerns: [
      { key: "family", label: "I want to protect my family" },
      { key: "how_much", label: "I'm not sure how much coverage I need" },
      { key: "affordable", label: "I need something affordable" },
      { key: "existing", label: "I want to review a policy I already have" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description: "Send your details and we pick up the conversation.",
        toAgent: true,
      },
      {
        key: "self_enroll",
        label: "Explore on my own",
        description: "Start with a needs calculator, then apply.",
        outcome: QuestionOutcome.REDIRECT,
      },
    ],
  },
  {
    key: "mortgage",
    label: "I want mortgage protection",
    description: "Coverage tied to your home and loan.",
    concerns: [
      { key: "payoff", label: "I want the mortgage paid if something happens" },
      { key: "family_home", label: "I want my family to keep the house" },
      { key: "cost", label: "I need to know what it costs monthly" },
      { key: "compare", label: "I want to compare options" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description: "We review your loan and recommend coverage.",
        toAgent: true,
        outcome: QuestionOutcome.CREATE_LEAD,
      },
    ],
  },
  {
    key: "funeral",
    label: "I am interested in a funeral plan",
    description: "Final expense and funeral planning.",
    concerns: [
      { key: "not_burden", label: "I don't want to burden my family" },
      { key: "costs", label: "I want to lock in funeral costs" },
      { key: "simple", label: "I want something simple to set up" },
      { key: "existing", label: "I already have a plan and need advice" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description: "We explain options and next steps.",
        toAgent: true,
        outcome: QuestionOutcome.CREATE_LEAD,
      },
    ],
  },
  {
    key: "travel",
    label: "I plan to travel abroad",
    description: "Cover that works past the border.",
    concerns: [
      { key: "destination", label: "I need cover for a specific trip" },
      { key: "medical", label: "I'm worried about medical care overseas" },
      { key: "length", label: "I'll be gone for an extended period" },
      { key: "family", label: "I'm traveling with family" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description: "Share dates and destination before you buy.",
        toAgent: true,
      },
      {
        key: "self_enroll",
        label: "See travel plans and buy",
        description: "Pick dates, destination, and age, then purchase.",
        outcome: QuestionOutcome.REDIRECT,
      },
    ],
  },
  {
    key: "something_else",
    label: "Something else",
    description: "Tell us what you need and we'll point you the right way.",
    concerns: [
      { key: "unsure", label: "I'm not sure what coverage I need" },
      { key: "multiple", label: "I need help with more than one product" },
      { key: "referral", label: "Someone referred me and I have questions" },
      { key: "other", label: "Something not listed above" },
    ],
    channels: [
      {
        key: "agent",
        label: "Talk to a licensed agent",
        description: "Tell us what you need and the best time to call.",
        toAgent: true,
        outcome: QuestionOutcome.CREATE_LEAD,
      },
    ],
  },
];

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
      prompt: "Which coverage do you need?",
      helpText: "Pick the option that fits you best right now.",
      answerType: AnswerType.SINGLE,
      mapsToLeadField: "coverageType",
      sortOrder: 1,
    },
  });

  const fullName = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "full_name",
      prompt: "What is your full name?",
      answerType: AnswerType.TEXT,
      mapsToLeadField: "fullName",
      sortOrder: 100,
    },
  });

  const email = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "email",
      prompt: "What is your email?",
      answerType: AnswerType.EMAIL,
      mapsToLeadField: "email",
      sortOrder: 101,
    },
  });

  const phone = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "phone",
      prompt: "What is the best number to reach you?",
      answerType: AnswerType.PHONE,
      mapsToLeadField: "phone",
      sortOrder: 102,
    },
  });

  const zip = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "zip",
      prompt: "What is your ZIP code?",
      answerType: AnswerType.ZIP,
      mapsToLeadField: "zip",
      sortOrder: 103,
    },
  });

  const callTime = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "best_time_to_call",
      prompt: "When is the best time to call?",
      answerType: AnswerType.SINGLE,
      mapsToLeadField: "preferredCallTime",
      sortOrder: 104,
    },
  });

  const notes = await prisma.question.create({
    data: {
      flowId: flow.id,
      key: "notes",
      prompt: "Anything you want us to know first?",
      helpText:
        "You can list other coverage interests beyond your original selection.",
      answerType: AnswerType.TEXT,
      mapsToLeadField: "message",
      sortOrder: 105,
    },
  });

  for (const [index, option] of [
    { key: "morning", label: "Morning" },
    { key: "afternoon", label: "Afternoon" },
    { key: "evening_weekend", label: "Evening / weekend by appointment" },
  ].entries()) {
    await prisma.questionEdge.create({
      data: {
        fromQuestionId: callTime.id,
        toQuestionId: notes.id,
        choiceKey: option.key,
        choiceLabel: option.label,
        sortOrder: index + 1,
      },
    });
  }

  await prisma.questionEdge.create({
    data: {
      fromQuestionId: notes.id,
      toQuestionId: null,
      choiceKey: "submit",
      choiceLabel: "Submit request",
      choiceDescription: "Creates a lead for follow-up.",
      outcome: QuestionOutcome.CREATE_LEAD,
      sortOrder: 1,
    },
  });

  for (const [coverageIndex, coverageOption] of COVERAGES.entries()) {
    const concern = await prisma.question.create({
      data: {
        flowId: flow.id,
        key: `concern_${coverageOption.key}`,
        prompt: "What worries you the most?",
        helpText: coverageOption.description,
        answerType: AnswerType.SINGLE,
        sortOrder: 10 + coverageIndex,
      },
    });

    const channel = await prisma.question.create({
      data: {
        flowId: flow.id,
        key: `channel_${coverageOption.key}`,
        prompt: "How would you like to do this?",
        helpText: "Nothing here signs you up for anything. You choose what happens next.",
        answerType: AnswerType.SINGLE,
        sortOrder: 50 + coverageIndex,
      },
    });

    await prisma.questionEdge.create({
      data: {
        fromQuestionId: coverage.id,
        toQuestionId: concern.id,
        choiceKey: coverageOption.key,
        choiceLabel: coverageOption.label,
        choiceDescription: coverageOption.description,
        sortOrder: coverageIndex + 1,
      },
    });

    for (const [concernIndex, concernOption] of coverageOption.concerns.entries()) {
      await prisma.questionEdge.create({
        data: {
          fromQuestionId: concern.id,
          toQuestionId: channel.id,
          choiceKey: concernOption.key,
          choiceLabel: concernOption.label,
          sortOrder: concernIndex + 1,
        },
      });
    }

    for (const [channelIndex, channelOption] of coverageOption.channels.entries()) {
      const goesToAgent = Boolean(channelOption.toAgent);
      await prisma.questionEdge.create({
        data: {
          fromQuestionId: channel.id,
          toQuestionId: goesToAgent ? fullName.id : null,
          choiceKey: channelOption.key,
          choiceLabel: channelOption.label,
          choiceDescription: channelOption.description,
          outcome: goesToAgent
            ? undefined
            : (channelOption.outcome ?? QuestionOutcome.REDIRECT),
          sortOrder: channelIndex + 1,
        },
      });
    }
  }

  await prisma.questionEdge.create({
    data: {
      fromQuestionId: fullName.id,
      toQuestionId: email.id,
      choiceKey: "continue",
      choiceLabel: "Continue",
      sortOrder: 1,
    },
  });
  await prisma.questionEdge.create({
    data: {
      fromQuestionId: email.id,
      toQuestionId: phone.id,
      choiceKey: "continue",
      choiceLabel: "Continue",
      sortOrder: 1,
    },
  });
  await prisma.questionEdge.create({
    data: {
      fromQuestionId: phone.id,
      toQuestionId: zip.id,
      choiceKey: "continue",
      choiceLabel: "Continue",
      sortOrder: 1,
    },
  });
  await prisma.questionEdge.create({
    data: {
      fromQuestionId: zip.id,
      toQuestionId: callTime.id,
      choiceKey: "continue",
      choiceLabel: "Continue",
      sortOrder: 1,
    },
  });

  return flow;
}

async function seedDemoLeads() {
  const newStatus = await prisma.leadStatus.findUniqueOrThrow({
    where: { code: "NEW" },
  });
  const contactedStatus = await prisma.leadStatus.findUniqueOrThrow({
    where: { code: "CONTACTED" },
  });
  const flow = await prisma.intakeFlow.findUniqueOrThrow({
    where: { slug: "home-intake" },
  });

  const coverageQuestion = await prisma.question.findUniqueOrThrow({
    where: { flowId_key: { flowId: flow.id, key: "coverage" } },
  });
  const concernQuestion = await prisma.question.findUniqueOrThrow({
    where: { flowId_key: { flowId: flow.id, key: "concern_under_65" } },
  });
  const channelQuestion = await prisma.question.findUniqueOrThrow({
    where: { flowId_key: { flowId: flow.id, key: "channel_under_65" } },
  });
  const callTimeQuestion = await prisma.question.findUniqueOrThrow({
    where: { flowId_key: { flowId: flow.id, key: "best_time_to_call" } },
  });
  const notesQuestion = await prisma.question.findUniqueOrThrow({
    where: { flowId_key: { flowId: flow.id, key: "notes" } },
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
        choiceKey: "cost",
      },
    },
  });
  const channelEdge = await prisma.questionEdge.findUniqueOrThrow({
    where: {
      fromQuestionId_choiceKey: {
        fromQuestionId: channelQuestion.id,
        choiceKey: "agent",
      },
    },
  });
  const callTimeEdge = await prisma.questionEdge.findUniqueOrThrow({
    where: {
      fromQuestionId_choiceKey: {
        fromQuestionId: callTimeQuestion.id,
        choiceKey: "morning",
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
        value: { choiceKey: "cost", label: concernEdge.choiceLabel },
      },
      {
        leadId: lead.id,
        questionId: channelQuestion.id,
        edgeId: channelEdge.id,
        value: { choiceKey: "agent", label: channelEdge.choiceLabel },
      },
      {
        leadId: lead.id,
        questionId: callTimeQuestion.id,
        edgeId: callTimeEdge.id,
        value: { choiceKey: "morning", label: callTimeEdge.choiceLabel },
      },
      {
        leadId: lead.id,
        questionId: notesQuestion.id,
        value: "Looking for a lower premium for my family of four.",
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
  await seedIntakeFlow();
  await seedDemoLeads();
  await seedAdminUser();
  console.log(
    "Seed complete: lead statuses, home-intake graph, demo leads, admin user.",
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
