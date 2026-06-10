# priority-lite/client/src/state/useEntries.ts

**שייך ל:** priority-lite / קליינט / state

## מה הקובץ עושה
שאילתות ופעולות על דיווחים מקומיים ב-Dexie, כולל זרימת הסנכרון לפריוריטי. ‏hooks ריאקטיביים (useLiveQuery): ‏usePendingEntries (טיוטות/שגיאות/בתהליך), useSyncedEntries ו-useDayEntries; פעולות CRUD: ‏addDraft / updateDraft / deleteEntry. הפונקציה המרכזית `syncEntries` שולחת טיוטות נבחרות ל-`/api/time-entries/sync` עם מכונת מצבים: draft/error ← pending ← (synced עם priorityRef | error עם הודעה) לפי תוצאה פר-פריט, ובכשל רשת כולל מחזירה את כולם ל-draft כדי שלא ייתקעו ב-pending.

## קבצים קשורים
- [[pl-client-db]] — טבלת timeEntries שהכול פועל עליה
- [[pl-client-lib-api]] — קריאת הסנכרון לשרת
- [[pl-server-routes-time-entries]] — צד השרת של הסנכרון
- [[pl-client-screens-entries]] — מסך האישור והשליחה
- [[pl-client-types]] — מודל LocalTimeEntry והסטטוסים
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
