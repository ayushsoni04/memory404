import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";

export default function NotFound() {
  return (
    <AuthShell>
      <div className="space-y-4">
        <h1 className="text-lg font-bold font-mono uppercase text-foreground">Page not found</h1>
        <p className="text-xs text-subtle">That address is not part of memory404.</p>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-pill-active px-3 text-xs font-bold text-pill-active-fg hover:opacity-90"
        >
          Back home
        </Link>
      </div>
    </AuthShell>
  );
}
