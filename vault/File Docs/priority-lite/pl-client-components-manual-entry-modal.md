# priority-lite/client/src/components/ManualEntryModal.tsx

**שייך ל:** priority-lite / קליינט / רכיבים

## מה הקובץ עושה
מודאל הדיווח הידני — יצירה או עריכה של טיוטת דיווח שעות. כולל בחירת משימה (דרך TaskPicker), תאריך, ושני מצבי קלט: משך חופשי ("1:30" או "1.5", מפוענח עם parseDuration) או טווח שעות התחלה/סיום (מחושב עם diffMinutes), פלוס הערה. ולידציה עם הודעות שגיאה בעברית. בשמירה יוצר טיוטה חדשה (UUID, ‏source manual) או מעדכן קיימת ומחזיר אותה לסטטוס draft עם איפוס שגיאת הסנכרון.

## קבצים קשורים
- [[pl-client-components-modal]] — מעטפת הדיאלוג
- [[pl-client-components-task-picker]] — בחירת המשימה
- [[pl-client-lib-duration]] — פענוח הקלט
- [[pl-client-state-use-entries]] — addDraft / updateDraft
- [[pl-client-screens-today]] — נפתח מהכפתור הצף ומעריכה
- [[pl-client-screens-entries]] — נפתח מעריכת טיוטה
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
