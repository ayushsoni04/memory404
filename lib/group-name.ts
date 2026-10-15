/** Long enough for a real collection name, short enough to read on a pill. */
export const GROUP_NAME_MAX = 60;

/** Why a group name cannot be saved, or null when it can. */
export function groupNameIssue(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Group name cannot be empty";
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return "Group names can't include line breaks.";
  }
  if (trimmed.length > GROUP_NAME_MAX) {
    return `Group names must be ${GROUP_NAME_MAX} characters or fewer.`;
  }
  return null;
}
