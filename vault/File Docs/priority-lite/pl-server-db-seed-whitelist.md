# priority-lite/server/src/db/seed-whitelist.ts

**שייך ל:** priority-lite / שרת / בסיס נתונים

## מה הקובץ עושה
‏CLI לטעינת whitelist עובדים מקובץ JSON אל טבלת employees ב-SQLite ‏(`npm run seed`, ברירת מחדל ./whitelist.json או נתיב שמועבר כארגומנט). מאמת כל רשומה עם zod (כולל email תקין), מנרמל את הטלפון עם normalizePhone ומדלג עם אזהרה על טלפונים לא תקינים, ומבצע upsert כך שהרצה חוזרת מעדכנת במקום לשכפל.

## קבצים קשורים
- [[pl-server-db]] — פונקציות createDb ו-upsertEmployee
- [[pl-server-auth-otp]] — מקור normalizePhone
- [[pl-server-whitelist-example]] — פורמט הקלט
- [[pl-server-whitelist]] — קובץ הקלט האמיתי
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
