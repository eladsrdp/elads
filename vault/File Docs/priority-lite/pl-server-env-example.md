# priority-lite/server/.env.example

**שייך ל:** priority-lite / שרת / קונפיגורציה

## מה הקובץ עושה
תבנית למשתני הסביבה של השרת — מעתיקים ל-.env וממלאים ערכים אמיתיים (בפיתוח אפשר לרוץ בלי .env בכלל). מתועדים בו שמות המשתנים בלבד (ללא ערכי אמת): `PORT`, ‏`NODE_ENV`, ‏`SESSION_SECRET` (חתימת ה-JWT — חובה ערך אקראי בפרודקשן), `DATABASE_PATH`, ‏`EMAIL_MODE` ‏(console/resend), ‏`RESEND_API_KEY`, ‏`OTP_FROM_EMAIL`, ‏`PRIORITY_MODE` ‏(mock/real), ‏`PRIORITY_BASE_URL`, ‏`PRIORITY_TABULA_INI`, ‏`PRIORITY_COMPANY`, ‏`PRIORITY_USER`, ‏`PRIORITY_PASSWORD` ו-`MOCK_FAIL_RATE` (הזרקת כשלים ב-mock). הקובץ כולל גם הערות על פרטי החיבור של חברת rdpltd.

## קבצים קשורים
- [[pl-server-env]] — סכמת ה-zod שטוענת ומאמתת את המשתנים האלה
- [[pl-gitignore]] — ה-.env האמיתי מוחרג מה-git שם
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
