# cashflow-pulse/package.json

**שייך ל:** cashflow-pulse / שורש הפרויקט (תצורת npm)

## מה הקובץ עושה
מניפסט ה-npm של הפרויקט. סקריפטים: `dev` (Vite), ‏`build` (tsc -b + vite build), ‏`lint`, ‏`preview`, ‏`test` (vitest run) ו-`test:watch`. תלויות ריצה: react/react-dom 19, ‏dexie + dexie-react-hooks (IndexedDB), ‏recharts (גרפים) ו-xlsx (פענוח דפי בנק). תלויות פיתוח: TypeScript 6, ‏Vite 8, ‏Tailwind CSS 4 (דרך פלאגין Vite), ‏Vitest 4 + Testing Library + jsdom, ו-ESLint 10 עם פלאגיני React.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-package-lock]] — נעילת גרסאות התלויות
- [[cf-vite-config]] — תצורת ה-build והבדיקות
- [[cf-tsconfig]] — תצורת TypeScript שה-build משתמש בה
- [[cf-eslint-config]] — תצורת ה-lint
