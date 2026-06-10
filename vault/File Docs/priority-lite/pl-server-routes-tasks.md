# priority-lite/server/src/routes/tasks.ts

**שייך ל:** priority-lite / שרת / API משימות

## מה הקובץ עושה
מסלולי המשימות תחת `/api/tasks`, כולם מוגנים ב-authRequired: ‏GET ‏/ (חיפוש עם q ו-limit), ‏GET ‏/:id (מסך בן — 404 אם לא נמצא) ו-POST ‏/ (יצירת משימה). שכבה דקה במכוון: מאמתת קלט עם הסכמות של שכבת הפעולות ומאצילה אליה את הביצוע, עם הודעות שגיאה גנריות בעברית.

## קבצים קשורים
- [[pl-server-actions]] — הפעולות והסכמות שהמסלולים מפעילים
- [[pl-server-auth-middleware]] — ההגנה על כל המסלולים
- [[pl-server-app]] — רושם את המסלולים
- [[pl-client-components-task-picker]] — הצרכן המרכזי בקליינט
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
