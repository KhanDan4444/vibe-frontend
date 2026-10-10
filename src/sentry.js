/**
 * @file sentry.js
 * @description Browser Sentry — no-op when VITE_SENTRY_DSN is unset (local/dev).
 */

import * as Sentry from '@sentry/react';

const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();

export const sentryEnabled = Boolean(dsn);

if (sentryEnabled) {
  const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0);
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
}

export { Sentry };
export const SentryErrorBoundary = Sentry.ErrorBoundary;
