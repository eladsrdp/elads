# priority-lite/client/tsconfig.app.json

**שייך ל:** priority-lite / קליינט / קונפיגורציה

## מה הקובץ עושה
הגדרות TypeScript לקוד האפליקציה (תיקיית src): ‏target ES2023 עם ספריות DOM, ‏JSX במצב react-jsx, ‏moduleResolution bundler עם allowImportingTsExtensions, מצב strict מלא כולל noUnusedLocals/Parameters, ‏erasableSyntaxOnly ו-noFallthroughCasesInSwitch. ‏noEmit — ה-build בפועל נעשה על ידי Vite, ו-tsc משמש רק לבדיקת טיפוסים.

## קבצים קשורים
- [[pl-client-tsconfig]] — ה-solution file שמפנה לכאן
- [[pl-client-package-json]] — סקריפט ה-build שמריץ tsc -b
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
