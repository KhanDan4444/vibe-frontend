/**
 * Format API trend strings for UI.
 * Huge swings usually mean a thin prior baseline (e.g. prior ≈ 0 → "+100%") — don't shout them beside a hero total.
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
  if (Math.abs(n) >= shoutMaxAbs) {
    return { label: null, extreme: true };
  }
  const sign = n > 0 ? '+' : '';
  return { label: `${sign}${n}%`, extreme: false };
}

/** i18n key for the comparison caption matching the selected revenue period. */
export function trendCaptionKeyForPreset(preset) {
  switch (preset) {
    case 'today':
      return 'pages.revenue.trendVs.today';
    case 'this_week':
      return 'pages.revenue.trendVs.thisWeek';
    case 'this_month':
      return 'pages.revenue.trendVs.thisMonth';
    case 'last_month':
      return 'pages.revenue.trendVs.lastMonth';
    case 'last_30_days':
      return 'pages.revenue.trendVs.last30Days';
    case 'this_year':
      return 'pages.revenue.trendVs.thisYear';
    case 'custom':
      return 'pages.revenue.trendVs.custom';
    default:
      return 'pages.revenue.trendVs.thisMonth';
  }
}

/** Clearer copy when prior period data is too thin to compare. */
export function trendThinBaselineKeyForPreset(preset) {
  switch (preset) {
    case 'today':
      return 'pages.revenue.trendThin.today';
    case 'this_week':
      return 'pages.revenue.trendThin.thisWeek';
    case 'this_month':
      return 'pages.revenue.trendThin.thisMonth';
    case 'last_month':
      return 'pages.revenue.trendThin.lastMonth';
    case 'last_30_days':
      return 'pages.revenue.trendThin.last30Days';
    case 'this_year':
      return 'pages.revenue.trendThin.thisYear';
    case 'custom':
      return 'pages.revenue.trendThin.custom';
    default:
      return 'pages.revenue.trendThin.fallback';
  }
}
