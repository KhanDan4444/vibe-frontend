// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import App from './App.jsx'
import i18n from './i18n'
import { isChunkLoadError, reloadOnceForStaleChunk } from './utils/chunkLoadRecovery'
import { bootstrapTheme } from './utils/themeStorage'
import { bootstrapLanguage } from './utils/langStorage'
import './index.css'

bootstrapTheme()
bootstrapLanguage(i18n)

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
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>,
)