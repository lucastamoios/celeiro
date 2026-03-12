import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initTelemetry } from './instrumentation'
import './index.css'
import App from './App.tsx'

initTelemetry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
