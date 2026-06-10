# .claude/skills/systematic-debugging/

**שייך ל:** תצורת Claude Code / סקילים

## מה הקובץ עושה
סקיל לדיבוג שיטתי של כל באג, כשל בדיקה או התנהגות לא צפויה — לפני הצעת תיקון. מדגיש מציאת שורש הבעיה (root cause) במקום טיפול בסימפטומים, והגנה רב-שכבתית. כולל מסמכים נלווים ודוגמאות קוד להמחשת טכניקות, וסקריפט לאיתור בדיקה "מזהמת".

קבצים פנימיים:
- `SKILL.md` — ההנחיות המרכזיות לדיבוג שיטתי.
- `root-cause-tracing.md` — מתודולוגיה לאיתור שורש הבעיה.
- `defense-in-depth.md` — גישת הגנה רב-שכבתית בפני באגים.
- `condition-based-waiting.md` + `condition-based-waiting-example.ts` — המתנה מבוססת-תנאי במקום sleep, עם דוגמה.
- `find-polluter.sh` — סקריפט לאיתור בדיקה שמזהמת בדיקות אחרות.
- `CREATION-LOG.md` — לוג יצירת הסקיל.
- `test-academic.md`, `test-pressure-1.md`, `test-pressure-2.md`, `test-pressure-3.md` — מקרי בדיקה לאימות הסקיל.

## קבצים קשורים
- [[cc-skill-test-driven-development]] — כתיבת בדיקה משחזרת כחלק מהדיבוג
- [[cc-skill-verification-before-completion]] — אימות שהתיקון אכן עובד
- [[skills-dev]] — קבוצת סקילי הפיתוח ב-vault
