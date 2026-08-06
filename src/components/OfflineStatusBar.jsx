// src/components/OfflineStatusBar.jsx
// Offline banner + pending-sync status for the gym portal.

import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, CloudUpload, AlertTriangle, X } from 'lucide-react';
import { useOffline } from '../offline/OfflineContext';

export default function OfflineStatusBar() {
  const { t } = useTranslation();
  const offline = useOffline();
  if (!offline) return null;

  const { online, pendingCount, failedJobs, syncing, syncNow, discardJob, discardFailed } = offline;

  const showOfflineBanner = !online;
  const showPending = pendingCount > 0;
  const showFailed = failedJobs.length > 0;

  if (!showOfflineBanner && !showPending && !showFailed) return null;

  return (
    <div className="mb-6 space-y-3">
      {showOfflineBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-app-border-subtle bg-app-raised px-4 py-3 text-sm text-app-text">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-app-muted" />
          <div>
            <p className="font-semibold">{t('offline.bannerTitle')}</p>
            <p className="mt-0.5">{t('offline.bannerBody')}</p>
          </div>
        </div>
      )}

      {showPending && (
        <div className="flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CloudUpload className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
            <p className="font-medium">
              {pendingCount === 1
                ? t('offline.pendingOne')
                : t('offline.pendingMany', { count: pendingCount })}
            </p>
          </div>
          {online && (
            <button
              type="button"
              onClick={syncNow}
              disabled={syncing}
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('offline.syncing') : t('offline.syncNow')}
            </button>
          )}
        </div>
      )}

      {showFailed && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
              <p className="font-semibold">{t('offline.failedTitle')}</p>
            </div>
            <button
              type="button"
              onClick={discardFailed}
              className="shrink-0 text-xs font-semibold text-rose-700 underline hover:text-rose-800 dark:text-rose-300"
            >
              {t('offline.discardAllFailed')}
            </button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {failedJobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{job.label}</span>
                  {job.lastError ? ` — ${job.lastError}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => discardJob(job.id)}
                  className="shrink-0 rounded p-1 text-rose-400 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/60"
                  aria-label={t('offline.discard')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
