/**
 * Humanize gym plan names for UI.
 * "Yearly(Gym)" / "Monthly (Gym)" → "Yearly · Gym"; plain names stay unchanged.
 */
export function formatPlanDisplayName(name) {
  if (name == null) return '';
  const raw = String(name).trim();
  if (!raw) return '';

  const match = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!match) return raw;

  const head = match[1].trim();
  const tag = match[2].trim();
  if (!head || !tag) return raw;

  return `${head} · ${tag}`;
}

/** Resolve a member's plan label from catalog match or snapshot name. */
export function resolveMemberPlanLabel(member, plans = [], fallback = '—') {
  const matching = plans.find((p) => p.id === member?.planId);
  const raw = matching?.name || member?.planName;
  if (!raw) return fallback;
  return formatPlanDisplayName(raw);
}
