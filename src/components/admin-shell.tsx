import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/require-admin";

export async function AdminShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  const session = await requireAdmin();

  return (
    <div className="min-h-full bg-surface-page">
      <header className="bg-brand-navy-950 text-text-inverse">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link
              href="/leads"
              className="font-brand text-sm font-semibold tracking-[0.08em] text-white uppercase focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand-gold-200"
            >
              Aegis{" "}
              <span className="font-accent normal-case tracking-normal text-brand-gold-200 italic">
                Admin
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/leads"
                className="text-white transition-colors hover:text-brand-gold-200 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand-gold-200"
              >
                Leads
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {session?.user?.email ? (
              <span className="hidden text-xs text-[#D6E4EA] sm:inline">
                {session.user.email}
              </span>
            ) : null}
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-white text-white hover:border-brand-gold-200 hover:bg-white/10 hover:text-brand-gold-200"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy-950 sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-text-secondary">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}
