# priority-lite/client/src/state/useAuth.tsx

**שייך ל:** priority-lite / קליינט / state

## מה הקובץ עושה
הקשר (Context) ההתחברות של האפליקציה — `AuthProvider` בודק בעלייה אם יש session תקף מול `/api/auth/me`, חושף את המשתמש (me), דגל טעינה, ופונקציות login/logout. מאזין לאירוע ה-401 הגלובלי מ-api.ts ומנתק אוטומטית כשה-session פג. ‏hook ‏`useAuth` נותן גישה מכל רכיב.

## קבצים קשורים
- [[pl-client-lib-api]] — מקור אירוע ה-401 וקריאות ה-API
- [[pl-client-main]] — עוטף את האפליקציה ב-AuthProvider
- [[pl-client-app]] — מחליט Login או אפליקציה לפי me
- [[pl-client-screens-login]] — קורא ל-login אחרי אימות OTP
- [[pl-server-routes-auth]] — צד השרת של me/logout
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
