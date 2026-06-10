# .claude/skills/writing-plans/

**שייך ל:** תצורת Claude Code / סקילים

## מה הקובץ עושה
סקיל ליצירת תוכנית מימוש מפורטת מתוך spec או דרישות, לפני נגיעה בקוד. מופעל אחרי שלב הסיעור (brainstorming) ומפרק משימה רב-שלבית לתוכנית בדידה וניתנת לאימות. כולל prompt ייעודי לסקירת מסמך התוכנית.

קבצים פנימיים:
- `SKILL.md` — ההנחיות לכתיבת התוכנית: מבנה, רמת פירוט וקריטריוני אימות.
- `plan-document-reviewer-prompt.md` — prompt לסקירת מסמך התוכנית לפני המימוש.

## קבצים קשורים
- [[cc-skill-brainstorming]] — מעביר את העבודה לסקיל זה כשלב הסיום
- [[cc-skill-executing-plans]] — מבצע את התוכנית שנכתבה כאן
- [[cc-skill-subagent-driven-development]] — מסלול מימוש חלופי לתוכנית
- [[skills-dev]] — קבוצת סקילי הפיתוח ב-vault
