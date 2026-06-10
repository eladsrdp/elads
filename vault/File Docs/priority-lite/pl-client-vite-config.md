# priority-lite/client/vite.config.ts

**שייך ל:** priority-lite / קליינט / קונפיגורציה

## מה הקובץ עושה
קונפיגורציית Vite של הקליינט: מפעילה את plugin React ואת plugin Tailwind v4, ומגדירה proxy בפיתוח — כל בקשה ל-`/api` מועברת לשרת ה-Hono על פורט 8787, כך שהקליינט והשרת חולקים origin אחד (וה-session cookie עובד בלי CORS). כוללת גם הגדרת vitest ‏(globals) לבדיקות הקליינט.

## קבצים קשורים
- [[pl-client-package-json]] — הסקריפטים שמשתמשים בקונפיגורציה
- [[pl-server-index]] — השרת שה-proxy מפנה אליו
- [[pl-client-tsconfig-node]] — בדיקת הטיפוסים של הקובץ הזה
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
