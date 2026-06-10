# cashflow-pulse/tsconfig.app.json

**שייך ל:** cashflow-pulse / שורש הפרויקט (תצורת TypeScript)

## מה הקובץ עושה
תצורת TypeScript לקוד האפליקציה (`include: ["src"]`): יעד ES2023 עם ספריות DOM, מצב bundler‏ (moduleResolution: bundler, noEmit — Vite מקמפל בפועל), JSX אוטומטי (react-jsx), ‏verbatimModuleSyntax (מחייב `import type`), ודגלי קפדנות כמו noUnusedLocals ו-noUnusedParameters. נבנה כחלק מ-`tsc -b` דרך ה-reference ב-tsconfig.json.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-tsconfig]] — קובץ ה-root שמפנה לכאן
- [[cf-tsconfig-node]] — התצורה המקבילה לקבצי תצורה
- [[cf-vite-config]] — ה-bundler שמקמפל בפועל
