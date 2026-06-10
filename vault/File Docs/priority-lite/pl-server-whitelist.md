# priority-lite/server/whitelist.json

**שייך ל:** priority-lite / שרת / נתונים (PII)

## מה הקובץ עושה
ה-whitelist האמיתי של עובדים מורשים — באותו פורמט של whitelist.example.json (טלפון, מייל, מזהה עובד בפריוריטי, שם). **מכיל פרטים אישיים אמיתיים** (טלפון ומייל של עובד), ולכן מוחרג מ-git ב-.gitignore והערכים שלו לא מתועדים כאן. נטען ל-SQLite דרך `npm run seed`; רק טלפונים שמופיעים בו יכולים לקבל OTP ולהתחבר לאפליקציה.

## קבצים קשורים
- [[pl-server-whitelist-example]] — תבנית הפורמט הציבורית
- [[pl-server-db-seed-whitelist]] — הסקריפט שטוען אותו
- [[pl-gitignore]] — ההחרגה מה-git
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
