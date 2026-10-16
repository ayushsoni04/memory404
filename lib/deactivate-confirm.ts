/** The word the delete-account dialog asks someone to type. */
export const DEACTIVATE_CONFIRMATION = "deactivate";

/** Letter case and surrounding spaces should not block a deliberate confirmation. */
export function isDeactivateConfirmation(value: string): boolean {
  return value.trim().toLowerCase() === DEACTIVATE_CONFIRMATION;
}
