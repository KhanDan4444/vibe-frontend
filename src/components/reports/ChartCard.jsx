/** Card wrapper for report chart sections. */
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';

export default function ChartCard({ title, subtitle, children, empty, compact = false }) {
  const { t } = useTranslation();
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-app-text-strong">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-app-muted">{subtitle}</p>}
      <div
        className={
          compact
            ? 'mt-3 h-48 sm:mt-4 sm:h-52'
            : 'mt-3 h-52 sm:mt-4 sm:h-60 md:h-64'
        }
      >
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-app-muted">
            {t('pages.noChartData')}
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
