# cashflow-pulse/src/screens/Settings.tsx

**שייך ל:** cashflow-pulse / שכבת ה-UI (מסכים)

## מה הקובץ עושה
מסך ההגדרות, שלושה אזורים: (1) כיסים — עריכת יתרה נוכחית ומסגרת אשראי לכל כיס, נשמר אוטומטית ב-onBlur דרך `updateScope`; (2) הוצאות והכנסות קבועות — טופס הוספת `Recurring` (כיס, סוג, סכום, יום בחודש, תיאור) ורשימת הקבועים הקיימים עם מחיקה; (3) גיבוי — כפתורי ייצוא גיבוי JSON ושחזור מקובץ (עם input file נסתר והודעת הצלחה/שגיאה).

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-db-operations]] — updateScope / addRecurring / deleteRecurring
- [[cf-src-lib-backup]] — exportBackup / importBackup
- [[cf-src-state-use-data]] — useScopes לרשימת הכיסים
- [[cf-src-components-forms]] — שדות הטופס
- [[cf-src-engine-forecast]] — expandRecurring שממיר את הקבועים לתנועות חזויות
