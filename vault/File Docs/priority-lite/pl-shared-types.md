# priority-lite/shared/src/types.ts

**שייך ל:** priority-lite / shared / טיפוסים

## מה הקובץ עושה
חוזה הטיפוסים המשותף בין השרת לקליינט — מקור אמת יחיד למבני הנתונים שעוברים ב-API. מגדיר: `Me` (תוכן ה-session: טלפון, שם, מזהה עובד בפריוריטי), `TaskSummary` ו-`TaskDetail` (משימה מחיפוש ומסך בן), `CreateTaskInput`, ‏`TimeEntryInput` (דיווח שעות לסנכרון, עם clientId שנוצר בקליינט), `SyncItemResult` (תוצאת סנכרון פר-פריט — כשל של פריט אחד לא מפיל את האחרים) ו-`RemoteTimeEntry` (דיווח שנקרא חזרה מפריוריטי).

## קבצים קשורים
- [[pl-server-actions]] — סכמות zod בשרת שמקבילות לטיפוסים האלה
- [[pl-server-priority-adapter]] — ממשק ה-adapter שמשתמש בטיפוסים
- [[pl-client-types]] — הקליינט מייצא מחדש את הטיפוסים ומוסיף את מודל הטיוטות
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
