# cashflow-pulse/src/import/parseStatement.test.ts

**שייך ל:** cashflow-pulse / בדיקות (Vitest)

## מה הקובץ עושה
בדיקות יחידה למודול פענוח דפי הבנק. מכסה את `parseDateCell` (ISO, ‏DD/MM/YYYY, נקודות, שנה דו-ספרתית, קלט זבל), את `parseAmountCell` (מספר רגיל, הסרת ₪ ופסיקים, שלילי מפורש, סוגריים כשלילי, קלט ריק), ואת `rowsToTransactions` (מיפוי שורות תקינות, דילוג על שורות פגומות, והיפוך סימן עם invertSign). רץ עם `npm test`.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-import-parse-statement]] — הקובץ הנבדק
- [[cf-vite-config]] — הגדרת סביבת הבדיקות
- [[cf-src-vitest-setup]] — קובץ ה-setup של הבדיקות
