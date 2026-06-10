# .claude/skills/using-superpowers/

**שייך ל:** תצורת Claude Code / סקילים

## מה הקובץ עושה
סקיל-מטא שמגדיר כיצד למצוא ולהשתמש בסקילים, ומופעל בתחילת כל שיחה (subagent ששוגר למשימה ספציפית מדלג עליו). הוא מבסס את הנוהג של הפעלת הסקיל המתאים לפני כל תגובה, כולל שאלות הבהרה. כולל קבצי reference למיפוי כלים בכלי CLI אחרים (Codex, Copilot, Gemini).

קבצים פנימיים:
- `SKILL.md` — כיצד לגלות סקילים ומתי להפעילם, כולל ה-SUBAGENT-STOP.
- `references/codex-tools.md` — מיפוי כלים עבור Codex.
- `references/copilot-tools.md` — מיפוי כלים עבור Copilot.
- `references/gemini-tools.md` — מיפוי כלים עבור Gemini.

## קבצים קשורים
- [[cc-skill-writing-skills]] — יצירה ועריכה של סקילים חדשים
- [[skills-dev]] — קבוצת סקילי הפיתוח ב-vault
