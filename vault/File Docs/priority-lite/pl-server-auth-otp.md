# priority-lite/server/src/auth/otp.ts

**שייך ל:** priority-lite / שרת / אימות

## מה הקובץ עושה
לוגיקת ה-OTP הטהורה — מקבלת DB ושעון (now) כפרמטרים כדי להיות קלה לבדיקה. `normalizePhone` מנרמל טלפון ישראלי לפורמט 05XXXXXXXX (כולל המרת קידומת 972). `requestOtp` בודק שהטלפון ב-whitelist, אוכף rate limit (עד 3 שליחות בחלון של 15 דקות), מגריל קוד בן 6 ספרות עם randomInt קריפטוגרפי ושומר ב-DB רק את ה-SHA-256 של הקוד (לא את הקוד עצמו). `verifyOtp` בודק תפוגה (10 דקות), מגביל ל-5 ניסיונות, ומוחק את הקוד אחרי שימוש מוצלח או חריגה.

## קבצים קשורים
- [[pl-server-db]] — טבלת otp_codes ופונקציית findEmployee
- [[pl-server-routes-auth]] — המסלולים שמפעילים requestOtp/verifyOtp
- [[pl-server-test-otp]] — בדיקות הלוגיקה
- [[pl-server-db-seed-whitelist]] — משתמש ב-normalizePhone בעת הטעינה
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
