const COVERAGE_LABELS: Record<string, string> = {
  under_65: "Under 65",
  turning_65: "Turning 65",
  on_medicare: "Already on Medicare",
  dental_vision: "Dental & Vision",
  life: "Life Insurance",
  travel: "Travel / Study Abroad",
};

const SOURCE_LABELS: Record<string, string> = {
  QUOTE_FORM: "Quote form",
  INTAKE_FLOW: "Intake flow",
};

export function coverageLabel(coverageType: string | null | undefined) {
  if (!coverageType) return "—";
  return COVERAGE_LABELS[coverageType] ?? coverageType;
}

export function sourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source;
}

export function displayName(profile: {
  firstName: string | null;
  lastName: string | null;
} | null | undefined, email: string) {
  const name = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || email;
}

export function formatAnswerValue(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.label === "string") return record.label;
    if (typeof record.choiceKey === "string") return record.choiceKey;
    return JSON.stringify(value);
  }
  return String(value);
}

export { COVERAGE_LABELS };
