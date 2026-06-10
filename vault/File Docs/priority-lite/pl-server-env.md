# priority-lite/server/src/env.ts

**שייך ל:** priority-lite / שרת / תשתית

## מה הקובץ עושה
טוען את משתני הסביבה (דרך dotenv) פעם אחת ומאמת אותם עם סכמת zod שכוללת ברירות מחדל ידידותיות לפיתוח — כך השרת רץ גם בלי .env. מטפל בקביעת הפורט: בפיתוח מקשיב ל-SERVER_PORT (כי PORT שייך לכלים אחרים כמו Vite), ובפרודקשן ל-PORT הסטנדרטי. מייצא את `env`, את הטיפוס `Env` ואת `isProd`, וכולל שער בטיחות: בפרודקשן זורק שגיאה אם SESSION_SECRET נשאר ערך ברירת המחדל של הפיתוח.

## קבצים קשורים
- [[pl-server-env-example]] — תיעוד המשתנים למילוי
- [[pl-server-index]] — הצרכן הראשי בעת ההרכבה
- [[pl-server-routes-auth]] — משתמש ב-isProd לדגל secure של ה-cookie
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
