// Lightweight server-timing instrumentation used to separate three costs that
// otherwise blur together in a single latency number:
//   - cold start   -> the first request handled by a freshly booted instance
//   - query        -> time spent awaiting the database
//   - transform    -> time spent shaping/serializing the response
//
// All output is prefixed with `[perf]` so it's trivial to grep in server logs.
// This is intentionally allocation-cheap and has no external dependencies.

const processBootMs = Date.now();
let firstServeHandled = false;

export type PerfTimer = {
  /** Record the duration of a phase since the previous mark (or timer start). */
  mark: (label: string) => void;
  /** Emit the aggregated `[perf]` line for this timer. */
  done: (scope: string) => void;
};

export function startTimer(): PerfTimer {
  const start = performance.now();
  let last = start;
  const marks: string[] = [];

  // The first timer created after boot is our proxy for a cold-started
  // instance. Subsequent requests reuse the warm process.
  const firstServe = !firstServeHandled;
  firstServeHandled = true;

  return {
    mark(label: string) {
      const nowMs = performance.now();
      marks.push(`${label}=${(nowMs - last).toFixed(1)}ms`);
      last = nowMs;
    },
    done(scope: string) {
      const total = performance.now() - start;
      const coldNote = firstServe
        ? ` cold=true instanceAge=${(Date.now() - processBootMs).toFixed(0)}ms`
        : " cold=false";
      console.info(
        `[perf] ${scope} ${marks.join(" ")} total=${total.toFixed(1)}ms${coldNote}`,
      );
    },
  };
}
