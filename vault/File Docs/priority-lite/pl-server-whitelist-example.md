# priority-lite/server/whitelist.example.json

**שייך ל:** priority-lite / שרת / נתוני דוגמה

## מה הקובץ עושה
קובץ דוגמה לפורמט ה-whitelist של עובדים: מערך JSON של רשומות עם `phone`, ‏`email`, ‏`priorityEmpId` ו-`name`. מכיל שני עובדים פיקטיביים (אלעד ודנה עם כתובות example.com) — נתונים מזויפים במכוון, לשימוש בפיתוח ובהדגמה. נטען דרך `npm run seed -w server -- ./whitelist.example.json`.

## קבצים קשורים
- [[pl-server-db-seed-whitelist]] — הסקריפט שטוען את הקובץ ל-SQLite
- [[pl-server-whitelist]] — המקבילה האמיתית (מוחרגת מ-git)
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
