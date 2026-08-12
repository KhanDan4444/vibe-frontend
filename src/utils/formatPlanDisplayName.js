/**
 * Humanize gym plan names for UI.
 * "Yearly(Gym)" / "Monthly (Gym)" / "Yearly - Gym" → "Yearly · Gym"; plain names stay unchanged.
 */
export function formatPlanDisplayName(name) {
  if (name == null) return '';
  const raw = String(name).trim();
  if (!raw) return '';

  const paren = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    const head = paren[1].trim();
    const tag = paren[2].trim();
    if (head && tag) return `${head} · ${tag}`;
  }

  // Spaced dash/en-dash/em-dash only — avoids breaking hyphenated single tokens.
  const dash = raw.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) {
    const head = dash[1].trim();
    const tag = dash[2].trim();
    if (head && tag) return `${head} · ${tag}`;
  }

  return raw;
}

/** Resolve a member's plan label from catalog match or snapshot name. */
export function resolveMemberPlanLabel(member, plans = [], fallback = '—') {
  const matching = plans.find((p) => p.id === member?.planId);
  const raw = matching?.name || member?.planName;
  if (!raw) return fallback;
  return formatPlanDisplayName(raw);
}
