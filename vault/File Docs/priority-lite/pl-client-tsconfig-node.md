# priority-lite/client/tsconfig.node.json

**שייך ל:** priority-lite / קליינט / קונפיגורציה

## מה הקובץ עושה
הגדרות TypeScript לקבצים שרצים ב-Node ולא בדפדפן — בפועל רק vite.config.ts. זהה ברוחו ל-tsconfig.app.json (ES2023, strict, noEmit) אבל עם types של node במקום ספריות DOM, כי קובץ הקונפיגורציה רץ בסביבת Node בזמן build.

## קבצים קשורים
- [[pl-client-tsconfig]] — ה-solution file שמפנה לכאן
- [[pl-client-vite-config]] — הקובץ היחיד שנכלל
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
