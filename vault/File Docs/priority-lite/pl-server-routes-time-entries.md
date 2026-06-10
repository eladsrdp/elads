# priority-lite/server/src/routes/timeEntries.ts

**שייך ל:** priority-lite / שרת / API דיווחי שעות

## מה הקובץ עושה
מסלולי דיווחי השעות תחת `/api/time-entries`, מוגנים ב-authRequired: ‏POST ‏/sync מקבל עד 100 טיוטות, מסנכרן אותן לפריוריטי **סדרתית בכוונה** (פריוריטי מגביל בקשות מקבילות) ומחזיר תוצאה פר-פריט; GET ‏/ קורא דיווחים קיימים של העובד המחובר בטווח תאריכים. הולידציה נעשית עם סכמות zod משכבת הפעולות.

## קבצים קשורים
- [[pl-server-actions]] — reportTime ו-getTimeEntries שהמסלולים מפעילים
- [[pl-server-auth-middleware]] — ההגנה על המסלולים
- [[pl-server-app]] — רושם את המסלולים
- [[pl-client-state-use-entries]] — זרימת הסנכרון מצד הקליינט
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
