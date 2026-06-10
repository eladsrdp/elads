# priority-lite/server/src/context.ts

**שייך ל:** priority-lite / שרת / תשתית

## מה הקובץ עושה
מגדיר את הממשק `AppContext` — חבילת התלויות המוזרקת לכל האפליקציה: `db` ‏(SQLite), ‏`adapter` (ממשק הגישה לפריוריטי), `email` (שולח ה-OTP) ו-`env` (קונפיגורציה). זה הבסיס לעקרון הזרקת התלויות בפרויקט: בדיקות יכולות להחליף כל חלק (למשל mock adapter ו-DB בזיכרון) בלי לגעת בקוד המסלולים.

## קבצים קשורים
- [[pl-server-app]] — צרכן ה-context המרכזי
- [[pl-server-db]] — טיפוס ה-DB
- [[pl-server-priority-adapter]] — ממשק ה-PriorityAdapter
- [[pl-server-email-sender]] — ממשק ה-EmailSender
- [[pl-server-env]] — טיפוס ה-Env
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
