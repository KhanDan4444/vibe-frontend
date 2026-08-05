import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';

/**
 * Error message + Retry with spinner while the retry request is in flight.
 * Keeps the banner visible (no content flash) during retry.
 */
export default function ErrorRetryBanner({ message, onRetry, className = '' }) {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  if (!message) return null;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p>{message}</p>
      <Button
        type="button"
        variant="danger"
        size="sm"
        loading={retrying}
        disabled={retrying}
        className="shrink-0"
        onClick={() => {
          if (retrying) return;
          setRetrying(true);
          void Promise.resolve(onRetry()).finally(() => {
            setRetrying(false);
          });
        }}
      >
        {t('common.retry')}
      </Button>
    </div>
  );
}
