# .claude/skills/subagent-driven-development/

**שייך ל:** תצורת Claude Code / סקילים

## מה הקובץ עושה
סקיל לביצוע תוכנית מימוש בתוך הסשן הנוכחי על ידי שיגור subagent טרי לכל משימה, עם סקירה דו-שלבית אחרי כל משימה: קודם בדיקת התאמה ל-spec, ואז בדיקת איכות קוד. מתאים לתוכניות עם משימות בלתי-תלויות שניתן להריץ ברצף בלי לאבד הקשר.

קבצים פנימיים:
- `SKILL.md` — זרימת השיגור והסקירה הדו-שלבית.
- `implementer-prompt.md` — prompt ל-subagent המבצע משימה בודדת.
- `spec-reviewer-prompt.md` — prompt לסקירת התאמה ל-spec.
- `code-quality-reviewer-prompt.md` — prompt לסקירת איכות הקוד.

## קבצים קשורים
- [[cc-skill-writing-plans]] — מייצר את התוכנית שמבוצעת כאן
- [[cc-skill-executing-plans]] — חלופה לביצוע בסשן נפרד עם checkpoints
- [[cc-skill-dispatching-parallel-agents]] — שיגור סוכנים מקבילים למשימות בלתי-תלויות
- [[skills-dev]] — קבוצת סקילי הפיתוח ב-vault
