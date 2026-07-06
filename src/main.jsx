// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import App from './App.jsx'
import i18n from './i18n'
import { bootstrapTheme } from './utils/themeStorage'
import { bootstrapLanguage } from './utils/langStorage'
import './index.css'

bootstrapTheme()
bootstrapLanguage(i18n)

ReactDOM.createRoot(document.getElementById('root')).render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>,
)