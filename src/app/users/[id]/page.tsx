import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusBadgeVariant } from "@/lib/lead-status";
import { coverageLabel, displayName, sourceLabel } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import {
  cardClassName,
  linkClassName,
  sectionLabelClassName,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

type Params = Promise<{ id: string }>;

export default async function UserProfilePage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isFinite(userId)) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      leads: {
        include: { status: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const personName = displayName(user.profile, user.email);

  return (
    <AdminShell
      title={personName}
      description="User profile and every lead submission, newest first."
    >
      <div className="mb-4">
        <Link href="/leads" className={cn(linkClassName, "text-sm")}>
          ← Back to leads
        </Link>
      </div>

      <div className={cn(cardClassName, "mb-6 p-5")}>
        <h2 className={cn(sectionLabelClassName, "mb-4")}>Profile</h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-text-muted">Email</dt>
            <dd className="font-medium text-brand-navy-950">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Phone</dt>
            <dd className="text-text-secondary">
              {user.profile?.phone ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">ZIP</dt>
            <dd className="text-text-secondary">{user.profile?.zip ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Type</dt>
            <dd>
              <Badge variant="outline">{user.role}</Badge>
            </dd>
          </div>
        </dl>
      </div>

      <div className={cn(cardClassName, "overflow-hidden")}>
        <div className="border-b border-border-subtle px-5 py-3">
          <h2 className={sectionLabelClassName}>
            Leads ({user.leads.length})
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border-subtle hover:bg-transparent">
              <TableHead className="text-brand-navy-900">Lead</TableHead>
              <TableHead className="text-brand-navy-900">Coverage</TableHead>
              <TableHead className="text-brand-navy-900">Source</TableHead>
              <TableHead className="text-brand-navy-900">Status</TableHead>
              <TableHead className="text-brand-navy-900">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {user.leads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-text-muted"
                >
                  No leads for this user yet.
                </TableCell>
              </TableRow>
            ) : (
              user.leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="border-border-subtle hover:bg-surface-subtle/60"
                >
                  <TableCell>
                    <Link
                      href={`/leads/${lead.id}`}
                      className={cn(linkClassName, "font-medium")}
                    >
                      Lead #{lead.id}
                    </Link>
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
