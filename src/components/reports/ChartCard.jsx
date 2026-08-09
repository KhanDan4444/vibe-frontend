/** Card wrapper for report chart sections. */
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';

export default function ChartCard({ title, subtitle, children, empty, compact = false }) {
  const { t } = useTranslation();
  return (
    <Card quiet className="p-4 sm:p-5">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-tight text-app-text-strong">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-app-muted">{subtitle}</p> : null}
      </div>
      <div
        className={
          compact
            ? 'mt-3 h-48 sm:mt-3.5 sm:h-52'
            : 'mt-3 h-52 sm:mt-3.5 sm:h-60 md:h-64'
        }
      >
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-lg bg-app-surface/40 text-sm text-app-muted">
            {t('pages.noChartData')}
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
