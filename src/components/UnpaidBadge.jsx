import React from 'react';
import { DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Badge for members enrolled without a payment for the current term. */
export default function UnpaidBadge({ compact = false }) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
        title={t('status.unpaidTooltip')}
      >
        <DollarSign className="h-3 w-3" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400">
      <DollarSign className="h-3 w-3" />
      {t('status.unpaid')}
    </span>
  );
}
