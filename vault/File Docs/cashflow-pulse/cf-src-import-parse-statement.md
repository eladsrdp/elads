# cashflow-pulse/src/import/parseStatement.ts

**שייך ל:** cashflow-pulse / מודול ייבוא (פענוח דפי בנק)

## מה הקובץ עושה
פענוח קבצי Excel/CSV שהורדו מאתר הבנק או חברת האשראי, באמצעות SheetJS‏ (xlsx). ‏`readSheet` קורא קובץ ומחזיר כותרות ושורות גולמיות כמחרוזות; `parseDateCell` ממיר פורמטי תאריך ישראליים נפוצים (DD/MM/YYYY, DD.MM.YYYY, שנה דו-ספרתית) ל-ISO; ‏`parseAmountCell` מנקה ₪, פסיקים וסוגריים (שליליים) וממיר למספר; ו-`rowsToTransactions` ממיר שורות לתנועות actual לפי מיפוי עמודות שבחר המשתמש (`ColumnMapping`), כולל אפשרות היפוך סימן לדפים שבהם הוצאות חיוביות. שורות לא תקינות נספרות ומדולגות. הכל פונקציות טהורות — ה-DB לא מעורב כאן.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-components-import-dialog]] — ה-UI שמפעיל את שרשרת הפענוח
- [[cf-src-db-operations]] — importTransactions שמקבלת את התוצאה
- [[cf-src-lib-date]] — toISO להמרת תאריכים
- [[cf-src-import-parse-statement-test]] — בדיקות היחידה של הפענוח
