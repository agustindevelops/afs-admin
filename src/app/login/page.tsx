import { redirect } from "next/navigation";
import { loginAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { fieldClassName } from "@/lib/ui";

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    redirect("/leads");
  }

  const { error } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-surface-page px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <p className="font-brand text-sm font-semibold tracking-[0.12em] text-brand-navy-950 uppercase">
            Aegis{" "}
            <span className="font-accent normal-case tracking-normal text-brand-gold-700 italic">
              Admin
            </span>
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-brand-navy-950">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Use your admin email and password to manage leads.
          </p>
        </div>

        <form
          action={loginAction}
          className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-6 shadow-[0_16px_40px_rgba(3,37,61,0.08)]"
        >
          {error ? (
            <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              Invalid email or password.
            </p>
          ) : null}

          <label className="grid gap-1.5 text-sm font-medium text-brand-navy-950">
            Email
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              className={fieldClassName}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-brand-navy-950">
            Password
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
              className={fieldClassName}
            />
          </label>

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
