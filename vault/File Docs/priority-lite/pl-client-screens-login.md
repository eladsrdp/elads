# priority-lite/client/src/screens/Login.tsx

**שייך ל:** priority-lite / קליינט / מסכים

## מה הקובץ עושה
מסך הכניסה — זרימה דו-שלבית: הזנת טלפון נייד ← בקשת OTP (השרת מחזיר רק רמז ממוסך של כתובת המייל) ← הזנת הקוד ← אימות ויצירת session. כולל cooldown של 30 שניות בין בקשות קוד, מצבי busy, והצגת שגיאות ApiError בעברית (מספר לא רשום, קוד שגוי וכו'). באימות מוצלח קורא ל-login של AuthProvider והאפליקציה נפתחת.

## קבצים קשורים
- [[pl-server-routes-auth]] — צד השרת של request-otp/verify-otp
- [[pl-client-state-use-auth]] — login אחרי הצלחה
- [[pl-client-lib-api]] — קריאות ה-API והשגיאות
- [[pl-client-components-forms]] — רכיבי הטופס
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
