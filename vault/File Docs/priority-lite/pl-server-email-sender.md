# priority-lite/server/src/email/sender.ts

**שייך ל:** priority-lite / שרת / מייל

## מה הקובץ עושה
שליחת מייל ה-OTP — ממשק `EmailSender` אחד עם שני מימושים: `createConsoleSender` (פיתוח — מדפיס את הקוד לטרמינל במקום לשלוח), ו-`createResendSender` ששולח מייל RTL אמיתי דרך Resend API עם הקוד בנושא ובגוף, וזורק שגיאה אם השליחה נכשלה. הבחירה ביניהם נעשית ב-index.ts לפי EMAIL_MODE ו-RESEND_API_KEY.

## קבצים קשורים
- [[pl-server-index]] — בוחר את המימוש לפי ה-env
- [[pl-server-routes-auth]] — קורא ל-sendOtp אחרי requestOtp מוצלח
- [[pl-server-context]] — הממשק חלק מה-AppContext
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
