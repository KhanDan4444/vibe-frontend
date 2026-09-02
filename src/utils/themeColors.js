/**
 * Theme meta / chart neutrals — keep in sync with index.css and vibe-mobile tokens.ts.
 */

/** Light secondary meta (app-muted / lightTheme.dim). */
export const lightMetaColor = '#475569';

/** Neutral donut/bar slice on light surfaces. */
export const lightChartNeutral = '#475569';

/** Dark placeholders & meta (app-dim / darkTheme.dim). */
export const darkMetaColor = '#7d8696';

/** Neutral donut/bar slice on dark surfaces (darkTheme.statusNeutral). */
export const darkChartNeutral = '#94a3b8';

export function metaColor(isDark) {
  return isDark ? darkMetaColor : lightMetaColor;
}

export function chartNeutral(isDark) {
  return isDark ? darkChartNeutral : lightChartNeutral;
}
