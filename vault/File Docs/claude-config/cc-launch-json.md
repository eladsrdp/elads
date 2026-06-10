# .claude/launch.json

**שייך ל:** תצורת Claude Code / הגדרות

## מה הקובץ עושה
קובץ תצורת הרצה (גרסה 0.0.1) המגדיר שלוש תצורות הפעלה לפרויקטים ולשרתים נלווים: `priority-lite` (npm run dev בתיקיית priority-lite, פורט 5173), `cashflow` (npm run dev בתיקיית cashflow-pulse, פורט 5173), ו-`Brainstorm Visualization Server` (הרצת `server.cjs` של סקיל ה-brainstorming דרך node, פורט 49152). התצורה האחרונה מתעדת ש-`BRAINSTORM_PORT` ו-`BRAINSTORM_DIR` ניתנים לקיבוע דרך משתני סביבה. הקובץ אינו מכיל סודות.

## קבצים קשורים
- [[cc-skill-brainstorming]] — הסקיל ששרת הויזואליזציה שלו מוגדר כאן
- [[cc-settings-json]] — קובץ ההגדרות המשותף בתיקיית ‎.claude/‎
- [[cc-settings-local-json]] — הגדרות מקומיות (הרשאות)
