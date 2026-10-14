export function createGroupErrorMessage(data: unknown, offline = false): string {
  if (!offline && data && typeof data === "object") {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
  }
  if (offline) {
    return "Failed to create group. Check your connection and try again.";
  }
  return "Failed to create group";
}
