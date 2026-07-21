import Link from "next/link";
import { WORKSPACE_LABS } from "./labs";

export function WorkspaceIndex() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {WORKSPACE_LABS.map((lab) => (
        <Link
          key={lab.slug}
          href={`/workspace/${lab.slug}`}
          className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-foreground/35"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[13px] font-medium text-foreground">
              {lab.title}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                lab.status === "ready"
                  ? "bg-success/15 text-success"
                  : "bg-pill text-muted"
              }`}
            >
              {lab.status}
            </span>
          </div>
          <p className="text-[13px] leading-snug text-muted">{lab.description}</p>
          <span className="mt-auto font-mono text-[11px] text-subtle transition-colors group-hover:text-foreground">
            /workspace/{lab.slug}
          </span>
        </Link>
      ))}
    </div>
  );
}
