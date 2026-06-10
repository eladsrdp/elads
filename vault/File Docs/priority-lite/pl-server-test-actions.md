# priority-lite/server/test/actions.test.ts

**שייך ל:** priority-lite / שרת / בדיקות

## מה הקובץ עושה
בדיקות vitest לשכבת הפעולות מול ה-mock adapter: חיפוש משימות (ריק ובעברית), שליפת מסך בן (כולל null למשימה לא קיימת), ודיווח שעות — כולל אימות שדיווח מוצלח מחזיר priorityRef וניתן לקריאה חזרה, ושמסלול הכשל מחזיר תוצאת שגיאה פר-פריט במקום exception. משתמש במשתמש בדיקה פיקטיבי.

## קבצים קשורים
- [[pl-server-actions]] — הקוד הנבדק
- [[pl-server-priority-mock]] — ה-adapter שהבדיקות רצות מולו
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
