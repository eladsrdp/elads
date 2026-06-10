# priority-lite/server/src/app.ts

**שייך ל:** priority-lite / שרת / נקודת כניסה

## מה הקובץ עושה
מרכיב את אפליקציית ה-Hono מתוך AppContext מוזרק — מופרד מ-index.ts כדי שבדיקות יוכלו להרכיב app עם תלויות מדומות. רושם את `/api/health` (מחזיר את מצבי priority/email), ומחבר את שלוש קבוצות המסלולים: `/api/auth`, ‏`/api/tasks` ו-`/api/time-entries`. כולל onError גלובלי שמלוגג את השגיאה בשרת ומחזיר JSON עם הודעה בלבד (בלי stack trace ללקוח).

## קבצים קשורים
- [[pl-server-index]] — מרכיב את ה-app עם תלויות אמיתיות
- [[pl-server-context]] — טיפוס ה-AppContext המוזרק
- [[pl-server-routes-auth]] — מסלולי האימות
- [[pl-server-routes-tasks]] — מסלולי המשימות
- [[pl-server-routes-time-entries]] — מסלולי דיווחי השעות
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
