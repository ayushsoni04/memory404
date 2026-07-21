import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WORKSPACE_LABS, type WorkspaceLab } from "./labs";

type Props = {
  children: React.ReactNode;
  /** When set, shows lab title + sibling lab links. When null, shows hub chrome. */
  lab?: WorkspaceLab | null;
};

export function WorkspaceChrome({ children, lab = null }: Props) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[var(--content-max)] flex-col gap-6 p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={lab ? "/workspace" : "/"}
            className="mb-2 inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden />
            {lab ? "Workspace" : "Vault"}
          </Link>
          <h1 className="font-mono text-lg tracking-tight text-foreground">
            {lab ? lab.title : "Workspace"}
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-snug text-muted">
            {lab
              ? lab.description
              : "Manual labs for motion and UI experiments."}
          </p>
        </div>

        {lab ? (
          <nav
            className="flex flex-wrap gap-1.5"
            aria-label="Workspace labs"
          >
            {WORKSPACE_LABS.map((item) => {
              const active = item.slug === lab.slug;
              return (
                <Link
                  key={item.slug}
                  href={`/workspace/${item.slug}`}
                  className={`rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                    active
                      ? "border-foreground/40 bg-surface text-foreground"
                      : "border-border bg-transparent text-muted hover:border-foreground/35 hover:text-foreground"
                  }`}
                >
                  {item.slug}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      {children}
    </div>
  );
}
