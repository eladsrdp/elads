# priority-lite/server/src/routes/auth.ts

**שייך ל:** priority-lite / שרת / אימות

## מה הקובץ עושה
מסלולי האימות תחת `/api/auth`: ‏request-otp (שולח קוד למייל של העובד — הקוד עצמו לעולם לא חוזר בתשובה, רק רמז ממוסך של כתובת המייל), verify-otp (מאמת ויוצר session cookie), ‏logout (מוחק את ה-cookie) ו-me (מחזיר את המשתמש המחובר). ה-cookie נקבע עם httpOnly + Secure (בפרודקשן) + SameSite=Lax. כל קודי השגיאה הפנימיים ממופים להודעות בעברית למשתמש, ו-rate limit מחזיר 429.

## קבצים קשורים
- [[pl-server-auth-otp]] — לוגיקת requestOtp/verifyOtp
- [[pl-server-auth-session]] — יצירת ה-JWT וה-cookie
- [[pl-server-app]] — רושם את המסלולים
- [[pl-client-screens-login]] — צד הקליינט של הזרימה
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
