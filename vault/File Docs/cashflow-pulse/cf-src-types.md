# cashflow-pulse/src/types.ts

**שייך ל:** cashflow-pulse / שכבת הדומיין (טיפוסים משותפים)

## מה הקובץ עושה
קובץ הטיפוסים המרכזי של האפליקציה — מגדיר את כל מודל הנתונים: `Scope` (כיס עסקי/ביתי עם יתרה נוכחית ומסגרת אשראי), `Transaction` (תנועה בודדת עם סטטוס actual/forecast ומקור manual/import/recurring/transfer), `Recurring` (הגדרת הוצאה/הכנסה קבועה חודשית), ו-`Transfer` (העברה בין כיסים). בנוסף מגדיר את טיפוסי הפלט של מנוע התחזית: `ForecastPoint`, `ForecastResult` ו-`PulseStatus` (safe/danger). כמעט כל קובץ בפרויקט מייבא ממנו — ה-DB, מנוע התחזית, המסכים והקומפוננטות.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-db-db]] — סכמת ה-Dexie בנויה סביב הטיפוסים האלה
- [[cf-src-engine-forecast]] — מנוע התחזית מקבל ומחזיר את הטיפוסים האלה
- [[cf-src-state-use-data]] — ה-hooks מחזירים `ForecastResult` ו-`Transaction`
