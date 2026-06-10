# priority-lite/package.json

**שייך ל:** priority-lite / root / קונפיגורציה

## מה הקובץ עושה
ה-package.json של שורש ה-monorepo. מגדיר npm workspaces ‏(shared, server, client) וסקריפטים מרכזיים: `dev` מריץ במקביל את השרת והקליינט (עם concurrently), `build` בונה את הקליינט, `test` מריץ בדיקות בשרת ובקליינט, `start` ו-`seed` מאצילים ל-workspace של השרת. התלות היחידה ברמת השורש היא concurrently.

## קבצים קשורים
- [[pl-server-package-json]] — workspace השרת שהסקריפטים מאצילים אליו
- [[pl-client-package-json]] — workspace הקליינט
- [[pl-shared-package-json]] — workspace הטיפוסים המשותפים
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
