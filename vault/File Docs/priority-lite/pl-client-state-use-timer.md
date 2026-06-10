# priority-lite/client/src/state/useTimer.ts

**שייך ל:** priority-lite / קליינט / state

## מה הקובץ עושה
הטיימר העמיד של האפליקציה — נשמר ב-localStorage והזמן תמיד מחושב now-startedAt, כך שהוא שורד reload, ‏sleep וסגירת ה-PWA. המצב מוחזק ב-store מודולרי משותף (useSyncExternalStore) כדי שכל הרכיבים יראו אותו מצב, כולל סנכרון בין טאבים דרך אירועי storage. ‏`useTimer` חושף start (בחירת משימה), stop (שומר טיוטה ב-Dexie עם עיגול לדקה שלמה ושעות התחלה/סיום) ו-discard, וכן דגל isStale לטיימר שרץ מעל 16 שעות (כנראה נשכח — שואלים במקום לשמור). `fmtElapsed` מפרמט לתצוגת "1:23:45".

## קבצים קשורים
- [[pl-client-components-timer-card]] — ה-UI של הטיימר
- [[pl-client-db]] — שמירת הטיוטה בעצירה
- [[pl-client-lib-date]] — toISODate ו-fmtClock
- [[pl-client-screens-today]] — מציג את הזמן הרץ בסה"כ היומי
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
