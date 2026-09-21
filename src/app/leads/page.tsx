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
  COVERAGE_LABELS,
  coverageLabel,
  displayName,
  sourceLabel,
} from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { cardClassName, fieldClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{
  status?: string;
  coverage?: string;
  source?: string;
}>;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const statusCode = params.status ?? "NEW";
  const coverage = params.coverage || undefined;
  const source = params.source || undefined;

  const statuses = await prisma.leadStatus.findMany({
    orderBy: { id: "asc" },
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
    orderBy: { createdAt: "desc" },
  });

  const coverageOptions = Object.entries(COVERAGE_LABELS);

  return (
    <AdminShell
      title="Leads"
      description="Newest submissions first. Default view is NEW."
    >
      <form
        className={cn(
          cardClassName,
          "mb-6 grid gap-3 p-4 sm:grid-cols-4",
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
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Apply filters
          </Button>
        </div>
      </form>

      <div className={cn(cardClassName, "overflow-hidden")}>
        <Table>
          <TableHeader>
            <TableRow className="border-border-subtle hover:bg-transparent">
              <TableHead className="text-brand-navy-900">Person</TableHead>
              <TableHead className="text-brand-navy-900">Coverage</TableHead>
              <TableHead className="text-brand-navy-900">Source</TableHead>
              <TableHead className="text-brand-navy-900">Status</TableHead>
              <TableHead className="text-brand-navy-900">Created</TableHead>
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
                    <Badge
                      variant={
                        lead.status.code === "NEW" ? "default" : "secondary"
                      }
                    >
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
