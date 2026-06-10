# cashflow-pulse/tsconfig.json

**שייך ל:** cashflow-pulse / שורש הפרויקט (תצורת TypeScript)

## מה הקובץ עושה
תצורת ה-root של TypeScript במבנה project references — לא מקמפל כלום בעצמו (`files: []`) אלא רק מפנה לשני תתי-הפרויקטים: `tsconfig.app.json` (קוד האפליקציה ב-src) ו-`tsconfig.node.json` (קבצי תצורה כמו vite.config.ts). הפקודה `tsc -b` בסקריפט ה-build בונה את שניהם.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-tsconfig-app]] — תצורת קוד האפליקציה
- [[cf-tsconfig-node]] — תצורת קבצי ה-build
- [[cf-package-json]] — סקריפט ה-build שמריץ tsc -b
