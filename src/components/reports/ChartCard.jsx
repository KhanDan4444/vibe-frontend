/** Card wrapper for report chart sections. */
import { useTranslation } from 'react-i18next';

export default function ChartCard({ title, subtitle, children, empty }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised p-5 shadow-sm dark:border-app-border-subtle dark:bg-app-raised">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-app-text-strong">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-app-muted">{subtitle}</p>}
      <div className="mt-4 h-72">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-app-muted">
            {t('pages.noChartData')}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
