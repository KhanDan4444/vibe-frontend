/** Default weekly visit cap (formerly labeled "Unlimited" — one visit per day). */
export const WEEKLY_VISIT_CAP_DEFAULT = 7;

export function effectiveVisitsPerWeek(visitsPerWeek) {
  return visitsPerWeek ?? WEEKLY_VISIT_CAP_DEFAULT;
}

export function effectiveVisitsLimit(visitsLimit, visitsPerWeek) {
  if (visitsLimit != null && Number.isFinite(Number(visitsLimit))) return Number(visitsLimit);
  return effectiveVisitsPerWeek(visitsPerWeek);
}
