import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// בודק עדכונים בכל פתיחה, כשחוזרים לאפליקציה ובכל דקה, ומרענן אוטומטית כשיוצאת גרסה חדשה
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => { void reg.update().catch(() => {}) }
    window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
