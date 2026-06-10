# cashflow-pulse/src/db/operations.ts

**שייך ל:** cashflow-pulse / שכבת הנתונים (פעולות CRUD)

## מה הקובץ עושה
שכבה דקה שמרכזת את כל פעולות הכתיבה מעל ה-DB: הוספה/מחיקה של תנועות, קבועים והעברות, ועדכון נתוני כיס (`updateScope`). שתי פעולות מורכבות יותר: `confirmTransaction` — הופכת תנועת forecast ל-actual ומעדכנת את יתרת הכיס בטרנזקציה אטומית; ו-`importTransactions` — ייבוא אצווה עם דילוג על כפילויות לפי תאריך+סכום+תיאור (משתמשת באינדקס המורכב `[scopeId+status]`). המסכים והדיאלוגים קוראים לפונקציות האלה במקום לגשת ל-DB ישירות.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-db-db]] — ה-singleton `db` שעליו מבוצעות הפעולות
- [[cf-src-types]] — חתימות הפונקציות בנויות על טיפוסי הדומיין
- [[cf-src-screens-ledger]] — משתמש ב-addTransaction / confirmTransaction / deleteTransaction
- [[cf-src-components-import-dialog]] — משתמש ב-importTransactions
- [[cf-src-screens-settings]] — משתמש ב-addRecurring / deleteRecurring / updateScope
- [[cf-src-screens-bridge]] — משתמש ב-addTransfer / deleteTransfer
