# cashflow-pulse/eslint.config.js

**שייך ל:** cashflow-pulse / שורש הפרויקט (תצורת lint)

## מה הקובץ עושה
תצורת ESLint במבנה flat config: מתעלם מ-dist, ועל כל קבצי ts/tsx מחיל את ההמלצות של ‎@eslint/js, ‏typescript-eslint, ‏react-hooks (חוקי ה-hooks) ו-react-refresh (תאימות ל-HMR של Vite), עם globals של דפדפן. מורץ דרך `npm run lint`.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-package-json]] — סקריפט ה-lint והתלויות
- [[cf-readme]] — מסביר איך להרחיב את התצורה לחוקים type-aware
