# cashflow-pulse/vite.config.ts

**שייך ל:** cashflow-pulse / שורש הפרויקט (תצורת build ובדיקות)

## מה הקובץ עושה
תצורת Vite מינימלית: שני פלאגינים — `@vitejs/plugin-react` (JSX + Fast Refresh) ו-`@tailwindcss/vite` (Tailwind 4). בנוסף מגדיר את בלוק ה-`test` של Vitest: globals מופעלים, סביבת jsdom, ו-`src/vitest-setup.ts` כקובץ setup. משמש את הסקריפטים dev/build/preview/test.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-package-json]] — הסקריפטים שמריצים את התצורה הזו
- [[cf-src-vitest-setup]] — קובץ ה-setup של הבדיקות
- [[cf-tsconfig-node]] — תצורת TypeScript שמכסה את הקובץ הזה
- [[cf-src-index-css]] — ה-Tailwind שהפלאגין מעבד
