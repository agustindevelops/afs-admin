import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">AFS Admin</h1>
      <p className="max-w-md text-muted-foreground">
        Admin dashboard starter. Next.js, Tailwind CSS, and shadcn/ui are set
        up.
      </p>
      <div className="flex items-center gap-3">
        <Button type="button">Get started</Button>
        <Link
          href="/"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Documentation
        </Link>
      </div>
    </main>
  );
}
