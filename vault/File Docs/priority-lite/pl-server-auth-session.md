# priority-lite/server/src/auth/session.ts

**שייך ל:** priority-lite / שרת / אימות

## מה הקובץ עושה
ניהול ה-session: ‏JWT חתום (HS256 עם jose) שנשמר ב-cookie בשם `pl_session` — stateless, בלי טבלת sessions בשרת. `createSessionToken` חותם את פרטי המשתמש (Me) עם תוקף של 7 ימים; `verifySessionToken` מאמת חתימה ותוקף ומוודא שכל שדות ה-Me קיימים ומהטיפוס הנכון, ומחזיר null על כל כשל במקום לזרוק.

## קבצים קשורים
- [[pl-server-routes-auth]] — יוצר את ה-token אחרי אימות OTP וקובע את ה-cookie
- [[pl-server-auth-middleware]] — מאמת את ה-token בכל בקשה מוגנת
- [[pl-shared-types]] — טיפוס Me שנחתם בתוך ה-JWT
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
