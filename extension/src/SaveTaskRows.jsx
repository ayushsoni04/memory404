import React, { useState } from "react";

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "Link";
  }
}

function SpinnerRing({ active, children }) {
  const size = 22;
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="task-ring" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="task-ring-svg"
        style={active ? { animation: "m404-spin 1.1s linear infinite" } : undefined}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={stroke}
        />
        {active ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.28} ${c * 0.72}`}
          />
        ) : null}
      </svg>
      <span className="task-ring-label">{children}</span>
    </span>
  );
}

function Badge({ tone, children }) {
  return <span className={`task-badge task-badge--${tone}`}>{children}</span>;
}

const XIcon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const CheckIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

function statusBadge(status, index) {
  if (status === "saving") return <SpinnerRing active>{index + 1}</SpinnerRing>;
  if (status === "saved") return <Badge tone="green">{CheckIcon}</Badge>;
  if (status === "failed") return <Badge tone="red">{XIcon}</Badge>;
  if (status === "skipped") return <Badge tone="muted">–</Badge>;
  return <SpinnerRing>{index + 1}</SpinnerRing>;
}

function statusPill(status) {
  if (status === "saved") {
    return <span className="task-pill task-pill--ok">Completed</span>;
  }
  if (status === "failed") {
    return <span className="task-pill task-pill--fail">Failed</span>;
  }
  if (status === "skipped") {
    return <span className="task-pill task-pill--skip">Skipped</span>;
  }
  if (status === "saving") {
    return <span className="task-pill task-pill--run">Saving</span>;
  }
  return null;
}

/**
 * Data-driven task list for multi-link / group saves.
 * @param {{ items: Array<{ url?: string, title?: string, status?: string, error?: string | null }> }} props
 */
export default function SaveTaskRows({ items = [] }) {
  const [manualOpen, setManualOpen] = useState({});

  if (!items.length) return null;

  return (
    <div className="task-rows" role="list" aria-label="Save progress">
      {items.map((row, i) => {
        const key = `${row.url || "item"}-${i}`;
        const status = row.status || "pending";
        const open = manualOpen[key] ?? status === "saving";
        const host = hostnameOf(row.url);
        const label = (row.title && row.title.trim()) || host;

        return (
          <div
            key={key}
            className={`task-row${open ? " is-open" : ""}`}
            role="listitem"
            style={{
              animation: `m404-fade-up 420ms cubic-bezier(0.23,1,0.32,1) ${Math.min(i, 8) * 40}ms both`,
            }}
          >
            <button
              type="button"
              aria-expanded={open}
              className="task-row-head"
              onClick={() =>
                setManualOpen((current) => ({ ...current, [key]: !open }))
              }
            >
              <span className="task-row-badge">{statusBadge(status, i)}</span>
              <span className="task-row-label" title={label}>
                {label}
              </span>
              <span className="task-row-meta" title={host}>
                {host}
              </span>
              {statusPill(status)}
              <span aria-hidden className="task-row-chevron">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            <div
              className="task-row-body"
              style={{
                gridTemplateRows: open ? "1fr" : "0fr",
                opacity: open ? 1 : 0,
              }}
            >
              <div className="task-row-body-inner">
                <div className="task-row-details">
                  <span aria-hidden className="task-row-rail" />
                  <div className="task-row-detail-list">
                    <div className="task-row-detail">
                      <span>URL</span>
                      <span className="task-row-detail-meta" title={row.url}>
                        {row.url || "—"}
                      </span>
                    </div>
                    <div className="task-row-detail">
                      <span>Status</span>
                      <span className="task-row-detail-meta">
                        {status === "saving"
                          ? "In progress"
                          : status === "saved"
                            ? "Saved"
                            : status === "failed"
                              ? row.error || "Failed"
                              : status === "skipped"
                                ? "Skipped"
                                : "Queued"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
