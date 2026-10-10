// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import App from './App.jsx'
import i18n from './i18n'
import { isChunkLoadError, reloadOnceForStaleChunk } from './utils/chunkLoadRecovery'
import { Sentry, SentryErrorBoundary, sentryEnabled } from './sentry'
import { bootstrapTheme } from './utils/themeStorage'
import { bootstrapLanguage } from './utils/langStorage'
import './index.css'

bootstrapTheme()
bootstrapLanguage(i18n)

if (import.meta.env.DEV) {
  console.log(sentryEnabled ? '[sentry] Enabled (web)' : '[sentry] Disabled (set VITE_SENTRY_DSN to enable)')
}

// Drop one-shot cache-bust query from stale-chunk recovery.
try {
  const url = new URL(window.location.href)
  if (url.searchParams.has('_swbust')) {
    url.searchParams.delete('_swbust')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  }
} catch {
  /* ignore */
}

// Catch chunk 404s that never reach React (e.g. Firefox dynamic import TypeError).
window.addEventListener('unhandledrejection', (event) => {
  if (isChunkLoadError(event.reason) && reloadOnceForStaleChunk()) {
    event.preventDefault()
    return
  }
  if (sentryEnabled && event.reason) {
    Sentry.captureException(event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
  }
})

window.addEventListener('error', (event) => {
  if (sentryEnabled && event.error) {
    Sentry.captureException(event.error)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <SentryErrorBoundary fallback={<p className="p-6 text-sm text-app-muted">Something went wrong. Please reload.</p>}>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </SentryErrorBoundary>,
)