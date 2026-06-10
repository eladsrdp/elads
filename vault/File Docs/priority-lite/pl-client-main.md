# priority-lite/client/src/main.tsx

**שייך ל:** priority-lite / קליינט / נקודת כניסה

## מה הקובץ עושה
נקודת הכניסה של React — טוען את ה-CSS הגלובלי, מרנדר את App בתוך StrictMode ועוטף אותו ב-AuthProvider כך שכל הרכיבים רואים את מצב ההתחברות. בנוסף רושם את ה-service worker, אבל רק בפרודקשן (בפיתוח הוא מפריע ל-HMR) ועם נפילה שקטה אם הרישום נכשל — האפליקציה עובדת גם בלי offline.

## קבצים קשורים
- [[pl-client-app]] — רכיב השורש שמרונדר
- [[pl-client-state-use-auth]] — ה-AuthProvider העוטף
- [[pl-client-index-css]] — ה-CSS הגלובלי שנטען
- [[pl-client-public-sw]] — ה-service worker שנרשם
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
