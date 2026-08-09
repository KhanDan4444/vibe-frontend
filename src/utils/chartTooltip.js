/**
 * Shared tooltip chrome for report charts.
 * @param {{ isDark: boolean, contentStyle: object }} chartTheme
 */
export function chartTooltipStyle(chartTheme) {
  return {
    ...chartTheme.tooltip.contentStyle,
    boxShadow: chartTheme.isDark
      ? '0 8px 20px rgba(0,0,0,0.32)'
      : '0 8px 20px rgba(15,23,42,0.1)',
    border: `1px solid ${chartTheme.isDark ? '#3a4150' : '#e2e8f0'}`,
    borderRadius: 10,
    padding: '8px 10px',
  };
}
