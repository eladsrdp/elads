# priority-lite/server/src/db/db.ts

**שייך ל:** priority-lite / שרת / בסיס נתונים

## מה הקובץ עושה
שכבת ה-SQLite של השרת (better-sqlite3 — סינכרוני, בלי שרת DB נפרד). `createDb` יוצר את הקובץ (או `:memory:` לבדיקות), מפעיל WAL ומקים שתי טבלאות: `employees` ‏(whitelist — טלפון, מייל, מזהה עובד בפריוריטי, שם, דגל active) ו-`otp_codes` (hash של הקוד, תפוגה, מוני ניסיונות ושליחות). מייצא גם `findEmployee` (רק עובדים פעילים) ו-`upsertEmployee` — כל השאילתות parameterized.

## קבצים קשורים
- [[pl-server-auth-otp]] — הצרכן המרכזי של שתי הטבלאות
- [[pl-server-db-seed-whitelist]] — ממלא את טבלת employees
- [[pl-server-index]] — יוצר את ה-DB בעליית השרת
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
