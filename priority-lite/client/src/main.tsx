import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './state/useAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// רישום service worker — רק בפרודקשן (בפיתוח זה מפריע ל-HMR)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // אין SW — האפליקציה עדיין עובדת, רק בלי offline
  })
}

// מבקשים אחסון "קבוע" (persistent) — מקטין משמעותית את הסיכוי שהדפדפן יפנה
// (ימחק) את ה-IndexedDB (טיוטות דיווחים שעדיין לא סונכרנו) תחת לחץ אחסון.
// לא הבטחה מוחלטת (המשתמש עדיין יכול לנקות ידנית), ולא אינטרוסיבי — ברוב
// הדפדפנים זה מוענק בשקט לפי היסטוריית שימוש, בלי פרומפט למשתמש.
if ('storage' in navigator && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {
    // אין תמיכה/נדחה — האפליקציה עדיין עובדת, רק בלי ההגנה הזו
  })
}
