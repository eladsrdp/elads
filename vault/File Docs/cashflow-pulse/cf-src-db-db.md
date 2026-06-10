# cashflow-pulse/src/db/db.ts

**שייך ל:** cashflow-pulse / שכבת הנתונים (IndexedDB דרך Dexie)

## מה הקובץ עושה
מגדיר את מחלקת `CashflowDB` (יורשת מ-Dexie) עם ארבע טבלאות: `scopes`, `transactions` (עם אינדקסים על scopeId, status, date ואינדקס מורכב `[scopeId+status]`), `recurrings` ו-`transfers`. מייצא singleton בשם `db` שכל שכבת הנתונים משתמשת בו, את `DEFAULT_SCOPES` (שני הכיסים — עסקי וביתי), ואת `ensureSeeded()` שיוצרת את הכיסים החסרים בהפעלה ראשונה. ה-seed ממומש כ-promise singleton כדי למנוע הרצה כפולה במצב React StrictMode.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-types]] — הטבלאות מוגדרות על טיפוסי הדומיין
- [[cf-src-db-operations]] — שכבת ה-CRUD שמעל ה-DB הזה
- [[cf-src-state-use-data]] — שאילתות חיות (useLiveQuery) ישירות על `db`
- [[cf-src-lib-backup]] — ייצוא/שחזור של כל הטבלאות
- [[cf-src-app]] — קורא ל-`ensureSeeded()` באתחול
