import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist-mono'
import './styles/globals.css'
// Depois dos tokens e do tema: na impressão, os tokens de print.css vencem os do tema atual (SUM-01.2).
import './styles/print.css'
import { App } from './app/App'
import { I18nProvider } from './i18n/I18nProvider'
import { initAnalytics } from './lib/analytics'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento #root não encontrado.')
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

// Depois do render: o analytics nunca atrasa nem impede o app de abrir (OPS-01.4).
initAnalytics()
