export const LEAD_STATUS_WORKFLOW = [
  {
    code: "UNSEEN",
    label: "Unseen",
    description: "Submitted and not yet opened",
    sortOrder: 1,
  },
  {
    code: "SEEN",
    label: "Seen",
    description: "Opened and reviewed",
    sortOrder: 2,
  },
  {
    code: "CALLED",
    label: "Called",
    description: "An agent has called this lead",
    sortOrder: 3,
  },
  {
    code: "SOLD",
    label: "Sold",
    description: "Coverage was sold",
    sortOrder: 4,
  },
] as const;

export const INITIAL_LEAD_STATUS_CODE = "UNSEEN";

/** Maps the previous pipeline onto the sales workflow so existing rows stay attached. */
export const LEGACY_LEAD_STATUS_MAP: Record<string, string> = {
  NEW: "UNSEEN",
  CONTACTED: "CALLED",
  ENGAGED: "CALLED",
  QUALIFIED: "CALLED",
  NURTURING: "CALLED",
  UNQUALIFIED: "SEEN",
  CONVERTED: "SOLD",
  LOST: "SEEN",
};

export const LEAD_SORTS = [
  { value: "created_desc", label: "Newest first" },
  { value: "created_asc", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "status_asc", label: "Status (unseen → sold)" },
  { value: "status_desc", label: "Status (sold → unseen)" },
  { value: "coverage_asc", label: "Coverage A–Z" },
  { value: "coverage_desc", label: "Coverage Z–A" },
] as const;

export type LeadSort = (typeof LEAD_SORTS)[number]["value"];

export function parseLeadSort(value: string | undefined): LeadSort {
  const match = LEAD_SORTS.find((option) => option.value === value);
  return match?.value ?? "created_desc";
}

export function statusBadgeVariant(
  code: string,
): "default" | "secondary" | "outline" {
  if (code === "UNSEEN") return "default";
  if (code === "SOLD") return "outline";
  return "secondary";
}

export function leadListHref(params: {
  status?: string;
  coverage?: string;
  source?: string;
  sort?: string;
}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.coverage) search.set("coverage", params.coverage);
  if (params.source) search.set("source", params.source);
  if (params.sort && params.sort !== "created_desc") {
    search.set("sort", params.sort);
  }
  const query = search.toString();
  return query ? `/leads?${query}` : "/leads";
}
