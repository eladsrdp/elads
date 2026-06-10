# priority-lite/server/src/auth/middleware.ts

**שייך ל:** priority-lite / שרת / אימות

## מה הקובץ עושה
‏Middleware של Hono שמגן על מסלולים: קורא את cookie ה-session, מאמת את ה-JWT, ואם אין session תקף מחזיר 401 עם הודעה בעברית. בהצלחה מציב את המשתמש (`me`) על ה-context של הבקשה דרך הטיפוס `AuthVars`, כך שה-handlers ניגשים אליו עם `c.get('me')`. בשימוש בכל מסלולי המשימות ודיווחי השעות.

## קבצים קשורים
- [[pl-server-auth-session]] — אימות ה-token עצמו
- [[pl-server-routes-tasks]] — מסלול מוגן שמשתמש בו
- [[pl-server-routes-time-entries]] — מסלול מוגן שמשתמש בו
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
