import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PaginationControls({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  disabled = false,
}) {
  const { t } = useTranslation();
  if (totalPages <= 1 && total <= limit) return null;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="safe-bottom flex flex-col gap-3 border-t border-app-border-subtle bg-app-surface/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-xs text-app-muted">
        {t('pagination.showing', { from, to, total })}
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg border border-app-border bg-app-raised px-3 py-2 text-xs font-semibold text-app-text active:bg-app-surface disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:flex-none sm:py-1.5 sm:hover:bg-app-surface"
        >
          <ChevronLeft className="h-4 w-4" /> {t('pagination.prev')}
        </button>
        <span className="shrink-0 px-1 text-xs font-medium text-app-text sm:px-2">
          {t('pagination.pageOf', { page, totalPages })}
        </span>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg border border-app-border bg-app-raised px-3 py-2 text-xs font-semibold text-app-text active:bg-app-surface disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:flex-none sm:py-1.5 sm:hover:bg-app-surface"
        >
          {t('pagination.next')} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
