# priority-lite/client/src/types.ts

**שייך ל:** priority-lite / קליינט / טיפוסים

## מה הקובץ עושה
שער הטיפוסים של הקליינט — מייצא מחדש את כל הטיפוסים המשותפים מ-`@priority-lite/shared` ומוסיף את המודל המקומי: `EntryStatus` ‏(draft / pending / synced / error) ו-`LocalTimeEntry` — דיווח שעות מקומי שנולד כטיוטה ב-IndexedDB ומסונכרן לפריוריטי רק אחרי אישור המשתמש. כולל מקור הדיווח (timer/manual), הפניית פריוריטי אחרי סנכרון ושגיאת סנכרון אם נכשל.

## קבצים קשורים
- [[pl-shared-types]] — הטיפוסים המשותפים שמיוצאים מחדש
- [[pl-client-db]] — סכמת ה-Dexie שמאחסנת LocalTimeEntry
- [[pl-client-state-use-entries]] — מנהל את מחזור החיים של הסטטוסים
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
