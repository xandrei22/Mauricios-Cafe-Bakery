import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

declare const __BUILD_ID__: string

const resolvedBuildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : `dev-${Date.now()}`

if (typeof window !== 'undefined') {
  ;(window as any).__MAURICIOS_BUILD_ID__ = resolvedBuildId
  console.log('🚀 Mauricio\'s Cafe build ID:', resolvedBuildId)
}

// Clean up any unwanted localStorage entries from browser extensions or libraries
// This removes loglevel which is often set by browser extensions
if (localStorage.getItem('loglevel')) {
  localStorage.removeItem('loglevel');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
