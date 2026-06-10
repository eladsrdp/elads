# priority-lite/client/src/components/TaskPicker.tsx

**שייך ל:** priority-lite / קליינט / רכיבים

## מה הקובץ עושה
בורר המשימות — מודאל חיפוש חי מול `/api/tasks` עם debounce של 300ms. כל תוצאה מהשרת מרעננת את מטמון המשימות ב-Dexie, וכשאין רשת נופל אוטומטית לסינון מקומי על המטמון עם באנר "מציג משימות מהמטמון המקומי" — כך אפשר לבחור משימה ולדווח גם offline. בחירה מחזירה TaskSummary וסוגרת את המודאל.

## קבצים קשורים
- [[pl-server-routes-tasks]] — צד השרת של החיפוש
- [[pl-client-db]] — מטמון tasksCache
- [[pl-client-lib-api]] — קריאת ה-API
- [[pl-client-components-modal]] — מעטפת הדיאלוג
- [[pl-client-components-timer-card]] — משתמש בו להתחלת טיימר
- [[pl-client-components-manual-entry-modal]] — משתמש בו לדיווח ידני
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
