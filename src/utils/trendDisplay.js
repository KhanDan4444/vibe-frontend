/**
 * Format API trend strings for UI.
 * Huge swings usually mean a thin prior baseline (e.g. last month ≈ 0) — don't shout them beside a hero total.
 */
export function formatTrendForDisplay(trend, { shoutMaxAbs = 100 } = {}) {
  if (trend == null || trend === '') {
    return { label: null, extreme: false };
  }
  const raw = String(trend).trim();
  if (!raw) return { label: null, extreme: false };

  const n = Number(raw.replace(/%/g, '').replace(/\+/g, '').replace(/,/g, ''));
  if (!Number.isFinite(n)) {
    return { label: raw, extreme: false };
  }
  if (Math.abs(n) > shoutMaxAbs) {
    return { label: null, extreme: true };
  }
  const sign = n > 0 ? '+' : '';
  return { label: `${sign}${n}%`, extreme: false };
}
