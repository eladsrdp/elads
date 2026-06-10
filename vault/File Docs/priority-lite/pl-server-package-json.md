# priority-lite/server/package.json

**שייך ל:** priority-lite / שרת / קונפיגורציה

## מה הקובץ עושה
מגדיר את החבילה `@priority-lite/server` ואת התלויות שלה: Hono ‏(+@hono/node-server) כ-framework, ‏better-sqlite3 ל-DB מקומי, jose ל-JWT, ‏zod לולידציה, dotenv ו-tsx להרצת TypeScript ישירות. סקריפטים: `dev` (node --watch עם tsx), `start`, ‏`typecheck`, ‏`test` (vitest) ו-`seed` לטעינת whitelist עובדים.

## קבצים קשורים
- [[pl-server-index]] — נקודת הכניסה שהסקריפטים מריצים
- [[pl-server-db-seed-whitelist]] — הסקריפט מאחורי `npm run seed`
- [[pl-package-json]] — שורש ה-monorepo שמאציל לכאן
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
