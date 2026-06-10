# priority-lite/server/src/actions/index.ts

**שייך ל:** priority-lite / שרת / לוגיקה עסקית

## מה הקובץ עושה
שכבת הפעולות של השרת — לכל פעולה זוג: סכמת zod ‏(searchTasksSchema, getTaskSchema, createTaskSchema, reportTimeSchema, getTimeEntriesSchema) ו-handler שמקבל adapter + משתמש מחובר (Me) + קלט מאומת. המסלולים קוראים לכאן, ובשלב הצ'אט המתוכנן (Phase 3) אותם schemas ישמשו כ-tool definitions ל-LLM בלי refactor. ‏`reportTime` עוטף כשל ב-SyncItemResult פר-פריט במקום exception, כך שדיווח שנכשל לא מפיל את שאר הסנכרון. כל הקלטים עוברים ולידציה קפדנית (regex לתאריך ושעה, גבולות אורך ומשך).

## קבצים קשורים
- [[pl-server-routes-tasks]] — מסלולים שקוראים ל-searchTasks/getTask/createTask
- [[pl-server-routes-time-entries]] — מסלולים שקוראים ל-reportTime/getTimeEntries
- [[pl-server-priority-adapter]] — הממשק שהפעולות מפעילות
- [[pl-shared-types]] — טיפוסי Me ו-SyncItemResult
- [[pl-server-test-actions]] — הבדיקות של השכבה הזו
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
