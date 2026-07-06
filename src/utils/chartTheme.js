import { useMemo } from 'react';
import { usePreferences } from '../context/PreferencesContext';

/** Recharts axis/grid colors that follow light/dark theme. */
export function useChartTheme() {
  const { isDark } = usePreferences();

  return useMemo(
    () => ({
      isDark,
      grid: isDark ? '#343a46' : '#f1f5f9',
      tick: isDark ? '#8b93a3' : '#64748b',
      tooltip: {
        contentStyle: {
          backgroundColor: isDark ? '#22262f' : '#ffffff',
          borderColor: isDark ? '#343a46' : '#e2e8f0',
          borderRadius: '8px',
          fontSize: '12px',
          color: isDark ? '#c4c9d4' : '#334155',
        },
      },
    }),
    [isDark]
  );
}
