import { useMemo } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { chartNeutral, darkMetaColor, lightMetaColor } from './themeColors';

/** Recharts axis/grid colors that follow light/dark theme. */
export function useChartTheme() {
  const { isDark } = usePreferences();

  return useMemo(
    () => ({
      isDark,
      grid: isDark ? '#343a46' : '#f1f5f9',
      tick: isDark ? darkMetaColor : lightMetaColor,
      tooltip: {
        contentStyle: {
          backgroundColor: isDark ? '#22262f' : '#ffffff',
          borderColor: isDark ? '#343a46' : '#e2e8f0',
          borderRadius: '8px',
          fontSize: '12px',
          color: isDark ? '#e0e4ec' : '#334155',
        },
      },
    }),
    [isDark]
  );
}

/** Fallback donut slice palette with theme-aware neutral slot. */
export function donutSlicePalette(isDark = false) {
  return ['#14b8a6', '#f59e0b', '#38bdf8', chartNeutral(isDark), '#fb7185', '#84cc16', '#a78bfa'];
}
