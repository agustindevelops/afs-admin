import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeadSource, Prisma } from "@/generated/prisma/client";
import {
  INITIAL_LEAD_STATUS_CODE,
  LEAD_SORTS,
  type LeadSort,
  leadListHref,
  parseLeadSort,
  statusBadgeVariant,
} from "@/lib/lead-status";
import {
  COVERAGE_LABELS,
  coverageLabel,
  displayName,
  leadListOrderBy,
  sourceLabel,
} from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { cardClassName, fieldClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{
  status?: string;
  coverage?: string;
  source?: string;
  sort?: string;
}>;

function SortableHead({
  label,
  asc,
  desc,
  sort,
  hrefFor,
}: {
  label: string;
  asc: LeadSort;
  desc: LeadSort;
  sort: LeadSort;
  hrefFor: (next: LeadSort) => string;
}) {
  const active = sort === asc || sort === desc;
  const next = sort === asc ? desc : asc;
  const indicator = sort === asc ? "↑" : sort === desc ? "↓" : "↕";

  return (
    <TableHead
      className="text-brand-navy-900"
      aria-sort={
        sort === asc ? "ascending" : sort === desc ? "descending" : "none"
      }
    >
      <Link
        href={hrefFor(next)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-brand-link focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand-blue-700",
          active && "text-brand-navy-950",
        )}
      >
        {label}
        <span className="text-xs text-text-muted" aria-hidden>
          {indicator}
        </span>
      </Link>
    </TableHead>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const statusCode = params.status ?? INITIAL_LEAD_STATUS_CODE;
  const coverage = params.coverage || undefined;
  const source = params.source || undefined;
  const sort = parseLeadSort(params.sort);

  const statuses = await prisma.leadStatus.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const where: Prisma.LeadWhereInput = {};
  if (statusCode !== "ALL") {
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
    include: {
      status: true,
      user: { include: { profile: true } },
    },
    orderBy: leadListOrderBy(sort),
  });

  const coverageOptions = Object.entries(COVERAGE_LABELS);
  const hrefFor = (nextSort: LeadSort) =>
    leadListHref({
      status: statusCode,
      coverage,
      source,
      sort: nextSort,
    });

  return (
    <AdminShell
      title="Leads"
      description="Quote and agent-assistance submissions. Default view is unseen leads."
    >
      <form
        className={cn(
          cardClassName,
          "mb-6 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5",
        )}
      >
        <label className="grid gap-1.5 text-sm font-medium text-brand-navy-950">
          Status
          <select
            name="status"
            defaultValue={statusCode}
            className={fieldClassName}
          >
            <option value="ALL">All statuses</option>
            {statuses.map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-navy-950">
          Coverage
          <select
            name="coverage"
            defaultValue={coverage ?? ""}
            className={fieldClassName}
          >
            <option value="">All coverage</option>
            {coverageOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-navy-950">
          Source
          <select
            name="source"
            defaultValue={source ?? ""}
            className={fieldClassName}
          >
            <option value="">All sources</option>
            <option value="QUOTE_FORM">Quote form</option>
            <option value="INTAKE_FLOW">Intake flow</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-navy-950">
          Sort
          <select name="sort" defaultValue={sort} className={fieldClassName}>
            {LEAD_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Apply
          </Button>
        </div>
      </form>

      <div className={cn(cardClassName, "overflow-hidden")}>
        <Table>
          <TableHeader>
            <TableRow className="border-border-subtle hover:bg-transparent">
              <SortableHead
                label="Person"
                asc="name_asc"
                desc="name_desc"
                sort={sort}
                hrefFor={hrefFor}
              />
              <SortableHead
                label="Coverage"
                asc="coverage_asc"
                desc="coverage_desc"
                sort={sort}
                hrefFor={hrefFor}
              />
              <TableHead className="text-brand-navy-900">Source</TableHead>
              <SortableHead
                label="Status"
                asc="status_asc"
                desc="status_desc"
                sort={sort}
                hrefFor={hrefFor}
              />
              <SortableHead
                label="Created"
                asc="created_asc"
                desc="created_desc"
                sort={sort}
                hrefFor={hrefFor}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-text-muted"
                >
                  No leads match these filters.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="border-border-subtle hover:bg-surface-subtle/60"
                >
                  <TableCell>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-brand-link underline-offset-4 hover:text-brand-navy-900 hover:underline"
                    >
                      {displayName(lead.user.profile, lead.user.email)}
                    </Link>
                    <div className="text-xs text-text-muted">
                      {lead.user.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {coverageLabel(lead.coverageType)}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {sourceLabel(lead.source)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(lead.status.code)}>
                      {lead.status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {lead.createdAt.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
