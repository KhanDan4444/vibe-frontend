import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';

const RETRY_MIN_BUSY_MS = 5000;

/**
 * Error message + Retry with spinner while the retry request is in flight.
 * Keeps the banner visible (no content flash) during retry.
 * Enforces a short minimum busy time so the spinner is visible even on instant failures.
 */
export default function ErrorRetryBanner({ message, onRetry, className = '' }) {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  if (!message) return null;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-app-border-subtle border-l-[3px] border-l-[color:var(--color-status-expired)] bg-app-raised px-4 py-3 text-sm text-app-text sm:flex-row sm:items-center sm:justify-between ${className}`}
      role="alert"
    >
      <p className="text-app-muted">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={retrying}
        disabled={retrying}
        className="shrink-0"
        onClick={() => {
          if (retrying) return;
          setRetrying(true);
          const started = Date.now();
          void Promise.resolve(onRetry())
            .catch(() => undefined)
            .finally(async () => {
              const wait = RETRY_MIN_BUSY_MS - (Date.now() - started);
              if (wait > 0) await new Promise((r) => setTimeout(r, wait));
              setRetrying(false);
            });
        }}
      >
        {t('common.retry')}
      </Button>
    </div>
  );
}
