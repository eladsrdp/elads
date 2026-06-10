# cashflow-pulse/tsconfig.node.json

**שייך ל:** cashflow-pulse / שורש הפרויקט (תצורת TypeScript)

## מה הקובץ עושה
תצורת TypeScript לקבצים שרצים בסביבת Node בזמן build — בפועל רק `vite.config.ts`. זהה כמעט לתצורת האפליקציה (ES2023, מצב bundler, noEmit, דגלי קפדנות) אבל עם `types: ["node"]` במקום טיפוסי DOM/Vite client, וללא JSX.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-tsconfig]] — קובץ ה-root שמפנה לכאן
- [[cf-tsconfig-app]] — התצורה המקבילה לקוד האפליקציה
- [[cf-vite-config]] — הקובץ היחיד שהתצורה מכסה
