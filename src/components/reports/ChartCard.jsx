/** Card wrapper for report chart sections. */
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';

export default function ChartCard({
  title,
  subtitle,
  children,
  empty,
  compact = false,
  tall = false,
  className = '',
}) {
  const { t } = useTranslation();
  const heightClass = compact
    ? 'mt-3 h-44 sm:mt-4 sm:h-48'
    : tall
      ? 'mt-3 h-56 sm:mt-4 sm:h-64 md:h-72'
      : 'mt-3 h-52 sm:mt-4 sm:h-60';

  return (
    <Card className={`p-4 sm:p-5 ${className}`.trim()}>
      <h3 className="text-sm font-semibold text-app-text-strong">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-app-muted">{subtitle}</p>}
      <div className={heightClass}>
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
