# cashflow-pulse/src/lib/backup.ts

**שייך ל:** cashflow-pulse / ספריית עזר (גיבוי ושחזור)

## מה הקובץ עושה
ייצוא ושחזור של כל הנתונים המקומיים לקובץ JSON. `exportBackup` שולפת את ארבע הטבלאות מה-DB, עוטפת אותן ב-payload עם חותמת זמן ושדה זיהוי `app: 'cashflow-pulse'`, ומורידה כקובץ דרך Blob + לינק זמני. `importBackup` קוראת קובץ גיבוי, מוודאת ששדה הזיהוי תקין, ואז בטרנזקציה אחת מוחקת את כל הנתונים הקיימים ומחליפה אותם בתוכן הגיבוי (עם fallback ל-DEFAULT_SCOPES אם אין כיסים בקובץ). מופעל ממסך ההגדרות.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-db-db]] — מקור הנתונים והיעד לשחזור (כולל DEFAULT_SCOPES)
- [[cf-src-types]] — מבנה ה-BackupFile בנוי על טיפוסי הדומיין
- [[cf-src-screens-settings]] — ה-UI שמפעיל ייצוא ושחזור
