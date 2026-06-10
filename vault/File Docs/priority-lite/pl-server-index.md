# priority-lite/server/src/index.ts

**שייך ל:** priority-lite / שרת / נקודת כניסה

## מה הקובץ עושה
נקודת הכניסה של השרת — ה-composition root שמרכיב תלויות אמיתיות לפי משתני הסביבה: יוצר את ה-SQLite DB, בוחר adapter לפריוריטי (odata במצב real, אחרת mock), בוחר שולח מייל (Resend אם הוגדר API key, אחרת הדפסה לקונסול), ומרכיב את אפליקציית ה-Hono. בפרודקשן בלבד מגיש גם את הקליינט הבנוי מ-client/dist (בפיתוח Vite מגיש אותו). לבסוף מאזין על הפורט מה-env ומדפיס שורת עלייה עם המצבים הפעילים.

## קבצים קשורים
- [[pl-server-app]] — הרכבת ה-Hono app שהקובץ קורא לה
- [[pl-server-env]] — קונפיגורציית הסביבה שקובעת את הבחירות
- [[pl-server-db]] — יצירת ה-DB
- [[pl-server-priority-mock]] — ה-adapter במצב פיתוח
- [[pl-server-priority-odata]] — ה-adapter במצב real
- [[pl-server-email-sender]] — שני מימושי שליחת המייל
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
