/** Stop this batch when the worker is no longer running it. */
export function saveLoopShouldStop(activeRunnerId, jobId) {
  return activeRunnerId !== jobId;
}

/**
 * A cancelled save is not a failure.
 * The panel goes back to the group list instead of an error screen.
 */
export function cancelledSaveJob(job, now = Date.now()) {
  return {
    ...(job && typeof job === "object" ? job : {}),
    status: "cancelled",
    error: null,
    updatedAt: now,
  };
}

/** Where the save panel should sit for a job status. */
export function phaseForSaveStatus(status) {
  if (status === "saving") return "saving";
  if (status === "saved") return "saved";
  if (status === "cancelled") return "pick";
  if (status === "error") return "error";
  return null;
}
