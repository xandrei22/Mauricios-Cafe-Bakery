import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
