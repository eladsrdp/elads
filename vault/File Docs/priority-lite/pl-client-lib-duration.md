# priority-lite/client/src/lib/duration.ts

**שייך ל:** priority-lite / קליינט / עוזרים

## מה הקובץ עושה
עוזרי משך זמן: `fmtMin` מפרמט דקות לתצוגת "שעות:דקות" (205 ← "3:25"); `parseDuration` מפענח קלט משתמש גמיש — "1:30" כשעות:דקות, מספרים עד 24 כשעות ("1.5" ← 90 דק'), ומספרים שלמים מעל 24 כדקות — ומחזיר null על קלט לא תקין; `diffMinutes` מחשב הפרש דקות בין שתי שעות HH:MM באותו יום (null אם הסדר הפוך). הלב של חוויית הדיווח הידני המהיר.

## קבצים קשורים
- [[pl-client-lib-duration-test]] — בדיקות היחידה של הקובץ
- [[pl-client-components-manual-entry-modal]] — הצרכן המרכזי של הפענוח
- [[pl-client-screens-today]] — משתמש ב-fmtMin לסה"כ היומי
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
