# priority-lite/client/src/lib/api.ts

**שייך ל:** priority-lite / קליינט / תשתית

## מה הקובץ עושה
עטיפת ה-fetch של הקליינט — פונקציית `api<T>` שמטפלת ב-JSON אוטומטית (אופציית json מסדרת את הגוף ומוסיפה Content-Type), ממירה כשלי רשת ושגיאות שרת ל-`ApiError` עם הודעות בעברית, ועל כל תשובת 401 משדרת אירוע גלובלי `pl:unauthorized` — כך AuthProvider מנתק את המשתמש אוטומטית כשה-session פג מכל מקום באפליקציה.

## קבצים קשורים
- [[pl-client-state-use-auth]] — מאזין לאירוע ה-401
- [[pl-client-state-use-entries]] — משתמש ב-api לסנכרון
- [[pl-client-components-task-picker]] — משתמש ב-api לחיפוש משימות
- [[pl-client-screens-login]] — משתמש ב-api לזרימת ה-OTP
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
