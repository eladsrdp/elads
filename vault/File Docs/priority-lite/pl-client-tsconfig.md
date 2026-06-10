# priority-lite/client/tsconfig.json

**שייך ל:** priority-lite / קליינט / קונפיגורציה

## מה הקובץ עושה
קובץ ה-tsconfig העליון של הקליינט — solution file ריק מקבצים שרק מפנה (references) לשני פרויקטים נפרדים: tsconfig.app.json לקוד האפליקציה ו-tsconfig.node.json לקבצי הקונפיגורציה של Vite. כך `tsc -b` בודק את שניהם עם הגדרות סביבה שונות (DOM מול Node).

## קבצים קשורים
- [[pl-client-tsconfig-app]] — הגדרות קוד האפליקציה
- [[pl-client-tsconfig-node]] — הגדרות vite.config.ts
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
