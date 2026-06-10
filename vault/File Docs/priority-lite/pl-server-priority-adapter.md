# priority-lite/server/src/priority/adapter.ts

**שייך ל:** priority-lite / שרת / אינטגרציית Priority

## מה הקובץ עושה
התפר המרכזי של האינטגרציה — מגדיר את הממשק `PriorityAdapter` שכל גישה לפריוריטי עוברת דרכו: ‏searchTasks, getTask, createTask, createTimeEntry ו-getTimeEntries. מגדיר גם את `NewTimeEntry` (דיווח חדש עם מזהה עובד, תאריך, משך ושעות אופציונליות). יש שני מימושים: mock לפיתוח ו-odata לחיבור אמיתי — שאר הקוד לא יודע ולא צריך לדעת באיזה מהם מדובר.

## קבצים קשורים
- [[pl-server-priority-mock]] — המימוש המדומה
- [[pl-server-priority-odata]] — המימוש האמיתי
- [[pl-server-actions]] — הצרכן של הממשק
- [[pl-shared-types]] — טיפוסי המשימות והדיווחים שהממשק מחזיר
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
