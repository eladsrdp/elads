# .claude/skills/brainstorming/

**שייך ל:** תצורת Claude Code / סקילים

## מה הקובץ עושה
סקיל שמלווה את הפיכת רעיון לעיצוב ולמפרט (spec) דרך דיאלוג שיתופי, לפני כל עבודה יצירתית. הוא אוכף שער קשיח: אין לכתוב קוד או להפעיל סקיל מימוש לפני שהוצג עיצוב והמשתמש אישר אותו. התהליך כולל חקר הקשר הפרויקט, שאלות הבהרה אחת בכל פעם, הצעת 2-3 גישות, הצגת העיצוב לפי סעיפים, כתיבת spec ל-`docs/superpowers/specs/` ומעבר לסקיל writing-plans. כולל "Visual Companion" אופציונלי — שרת מקומי דפדפני להצגת mockups ודיאגרמות במהלך הסיעור.

קבצים פנימיים:
- `SKILL.md` — התהליך המלא, ה-HARD-GATE, צ'קליסט וזרימת ה-process.
- `visual-companion.md` — מדריך מפורט להפעלת המלווה הויזואלי הדפדפני.
- `spec-document-reviewer-prompt.md` — prompt לסקירת מסמך ה-spec.
- `scripts/server.cjs` — שרת Node המגיש את הויזואליזציות (מוגדר ב-launch.json).
- `scripts/helper.js` — לוגיקת עזר ל-frontend של הויזואליזציה.
- `scripts/frame-template.html` — תבנית ה-HTML של ה-frame המוצג.
- `scripts/start-server.sh` / `scripts/stop-server.sh` — סקריפטים להפעלה ועצירה של השרת.

## קבצים קשורים
- [[cc-launch-json]] — מגדיר את "Brainstorm Visualization Server" שמריץ את server.cjs
- [[cc-skill-writing-plans]] — מצב הסיום של הסיעור הוא מעבר לסקיל זה
- [[skills-dev]] — קבוצת סקילי הפיתוח ב-vault
