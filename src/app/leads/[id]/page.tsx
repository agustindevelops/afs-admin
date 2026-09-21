import Link from "next/link";
import { notFound } from "next/navigation";
import { updateLeadStatus } from "@/app/leads/actions";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusBadgeVariant } from "@/lib/lead-status";
import {
  coverageLabel,
  displayName,
  formatAnswerValue,
  sourceLabel,
} from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import {
  cardClassName,
  fieldClassName,
  linkClassName,
  sectionLabelClassName,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const leadId = Number(id);

  if (!Number.isFinite(leadId)) {
    notFound();
  }

  const [lead, statuses] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      include: {
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
            question: { sortOrder: "asc" },
          },
        },
      },
    }),
    prisma.leadStatus.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!lead) {
    notFound();
  }

  const personName = displayName(lead.user.profile, lead.user.email);

  return (
    <AdminShell
      title={`Lead #${lead.id}`}
      description={`${personName} · ${sourceLabel(lead.source)}`}
    >
      <div className="mb-4">
        <Link href="/leads" className={cn(linkClassName, "text-sm")}>
          ← Back to leads
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Could not update lead status. Try again.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className={cn(cardClassName, "p-5")}>
            <h2 className={cn(sectionLabelClassName, "mb-4")}>Contact</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-text-muted">Name</dt>
                <dd className="font-medium text-brand-navy-950">
                  <Link href={`/users/${lead.user.id}`} className={linkClassName}>
                    {personName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Email</dt>
                <dd className="text-text-secondary">{lead.user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Phone</dt>
                <dd className="text-text-secondary">
                  {lead.user.profile?.phone ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">ZIP</dt>
                <dd className="text-text-secondary">
                  {lead.user.profile?.zip ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Coverage</dt>
                <dd className="text-text-secondary">
                  {coverageLabel(lead.coverageType)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Source</dt>
                <dd className="text-text-secondary">
                  {sourceLabel(lead.source)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Preferred call time</dt>
                <dd className="text-text-secondary">
                  {lead.preferredCallTime?.label ?? "—"}
                </dd>
              </div>
            </dl>
            {lead.message ? (
              <div className="mt-4 border-t border-border-subtle pt-4">
                <dt className="text-xs text-text-muted">Message</dt>
                <dd className="mt-1 text-sm whitespace-pre-wrap text-text-secondary">
                  {lead.message}
                </dd>
              </div>
            ) : null}
          </div>

          <div className={cn(cardClassName, "p-5")}>
            <h2 className={cn(sectionLabelClassName, "mb-4")}>
              Questions & answers
            </h2>
            {lead.answers.length === 0 ? (
              <p className="text-sm text-text-muted">
                No intake answers for this lead
                {lead.source === "QUOTE_FORM"
                  ? " (submitted via quote form)."
                  : "."}
              </p>
            ) : (
              <ol className="space-y-4">
                {lead.answers.map((answer, index) => (
                  <li
                    key={answer.id}
                    className="rounded-lg border border-border-subtle bg-surface-subtle/50 p-4"
                  >
                    <div className="mb-1 text-xs font-medium text-text-muted">
                      Q{index + 1} · {answer.question.key}
                    </div>
                    <p className="font-medium text-brand-navy-950">
                      {answer.question.prompt}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {answer.edge?.choiceLabel ??
                        formatAnswerValue(answer.value)}
                    </p>
                    {answer.edge?.choiceDescription ? (
                      <p className="mt-1 text-xs text-text-muted">
                        {answer.edge.choiceDescription}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className={cn(cardClassName, "p-5")}>
            <h2 className={cn(sectionLabelClassName, "mb-3")}>Status</h2>
            <ol className="mb-4 flex flex-col gap-2">
              {statuses.map((status, index) => {
                const current = status.code === lead.status.code;
                return (
                  <li key={status.code} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        current
                          ? "bg-brand-gold-500 text-brand-navy-950"
                          : "bg-surface-subtle text-text-secondary",
                      )}
                      aria-current={current ? "step" : undefined}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        current
                          ? "font-semibold text-brand-navy-950"
                          : "text-text-secondary",
                      )}
                    >
                      {status.label}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mb-4">
              <Badge variant={statusBadgeVariant(lead.status.code)}>
                {lead.status.label}
              </Badge>
              <p className="mt-2 text-xs text-text-muted">
                {lead.status.description}
              </p>
            </div>
            <form action={updateLeadStatus} className="space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <label className="grid gap-1.5 text-sm font-medium text-brand-navy-950">
                Update status
                <select
                  name="statusCode"
                  defaultValue={lead.status.code}
                  className={fieldClassName}
                >
                  {statuses.map((status) => (
                    <option key={status.code} value={status.code}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" className="w-full">
                Save status
              </Button>
            </form>
          </div>

          <div className={cn(cardClassName, "p-5 text-sm")}>
            <h2 className={cn(sectionLabelClassName, "mb-3")}>Meta</h2>
            <dl className="space-y-2">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Created</dt>
                <dd className="text-text-secondary">
                  {lead.createdAt.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Updated</dt>
                <dd className="text-text-secondary">
                  {lead.updatedAt.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Flow</dt>
                <dd className="text-text-secondary">{lead.flow?.name ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
