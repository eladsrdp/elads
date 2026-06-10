# priority-lite/client/src/db/db.ts

**שייך ל:** priority-lite / קליינט / אחסון מקומי

## מה הקובץ עושה
בסיס הנתונים המקומי של הקליינט — IndexedDB דרך Dexie, עם שתי טבלאות: `timeEntries` (טיוטות ודיווחים, עם אינדקסים על status, ‏date ואינדקס מורכב [status+date]) ו-`tasksCache` (מטמון משימות מהשרת לעבודה offline, עם חותמת cachedAt). מייצא singleton ‏`db` שכל ה-hooks והרכיבים משתמשים בו.

## קבצים קשורים
- [[pl-client-types]] — טיפוס LocalTimeEntry שמאוחסן
- [[pl-client-state-use-entries]] — שאילתות ופעולות על timeEntries
- [[pl-client-state-use-summary]] — סיכומים מחושבים מהטבלה
- [[pl-client-components-task-picker]] — ממלא וקורא את tasksCache
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
