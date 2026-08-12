/** Card wrapper for report chart sections. */
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import { panelTitle } from '../../utils/surfaceClasses';

export default function ChartCard({ title, subtitle, children, empty, compact = false }) {
  const { t } = useTranslation();
  return (
    <Card quiet className="p-4 sm:p-5">
      <div className="min-w-0">
        <h3 className={panelTitle}>{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs leading-relaxed text-app-muted">{subtitle}</p> : null}
      </div>
      <div
        className={
          compact
            ? 'mt-3 h-60 sm:mt-3.5 sm:h-64'
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
