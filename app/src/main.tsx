import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/noto-sans-armenian/wdth.css'
import { App } from './App.tsx'
import './styles.css'

// The service worker makes the app installable on Android (DECISIONS.md #13). Only in the built app: the dev server has
// no /armenia-driving-test/ base and needs no install. A failed registration reaches the page's error banner (index.html).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch((err: unknown) => {
    throw new Error(`Հավելվածը չհաջողվեց տեղադրելի դարձնել այս սարքում. ${err instanceof Error ? err.message : String(err)}`)
  })
}

const root = document.getElementById('root')
if (!root) throw new Error('index.html has no #root element')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
