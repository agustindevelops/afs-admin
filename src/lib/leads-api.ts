import type { Prisma } from "@/generated/prisma/client";

export const leadListInclude = {
  status: true,
  preferredCallTime: true,
  user: { include: { profile: true } },
} satisfies Prisma.LeadInclude;

export const leadDetailInclude = {
  status: true,
  preferredCallTime: true,
  flow: true,
  user: { include: { profile: true } },
  answers: {
    include: {
      question: true,
      edge: true,
    },
    orderBy: {
      question: { sortOrder: "asc" as const },
    },
  },
} satisfies Prisma.LeadInclude;

export type CreateLeadAnswerInput = {
  questionKey: string;
  choiceKey?: string;
  value?: unknown;
};

export type CreateLeadContactInput = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  zip?: string;
  preferredCallTime?: string;
};

export type CreateLeadBody = {
  flowSlug?: string;
  source?: string;
  coverageType?: string;
  message?: string;
  answers?: CreateLeadAnswerInput[];
  contact?: CreateLeadContactInput;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value);
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
