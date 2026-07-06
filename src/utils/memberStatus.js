/** Member status values stored in PostgreSQL (lowercase). */
export const MEMBER_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  DUE_SOON: 'due soon',
};

/**
 * Display-cased status labels used in the UI layer (badges, filters, comparisons).
 * Members in GymContext have their status mapped through formatMemberStatusForDisplay,
 * so these constants match what is stored in the members array at runtime.
 */
export const DISPLAY_STATUS = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  DUE_SOON: 'Due Soon',
};

/** @param {string | undefined} status */
export function normalizeMemberStatus(status) {
  if (!status || typeof status !== 'string') return status;
  const lower = status.trim().toLowerCase();
  if (lower === 'due soon' || lower === 'due_soon') return MEMBER_STATUS.DUE_SOON;
  return lower;
}

/** UI label for badges and filters (Active, Expired, Due Soon). */
export function formatMemberStatusForDisplay(status) {
  const normalized = normalizeMemberStatus(status);
  if (!normalized) return DISPLAY_STATUS.ACTIVE;
  if (normalized === MEMBER_STATUS.DUE_SOON) return DISPLAY_STATUS.DUE_SOON;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
