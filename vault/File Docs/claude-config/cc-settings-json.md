# .claude/settings.json

**שייך ל:** תצורת Claude Code / הגדרות

## מה הקובץ עושה
קובץ ההגדרות המשותף של הפרויקט. כרגע הוא מגדיר hook יחיד מסוג `UserPromptSubmit`: בכל הגשת prompt רץ פקודת PowerShell שמזריקה הקשר נוסף (`additionalContext`) המורה להפעיל את הסקיל `obsidian-vault-workflow` בתחילת הסשן — לקרוא את `vault/Meeting Notes/_index.md` ואת קובץ הנושא הרלוונטי לפני ביצוע משימה. כך נאכף פרוטוקול ה-vault על כל אינטראקציה. הקובץ אינו מכיל סודות.

## קבצים קשורים
- [[cc-skill-obsidian-vault-workflow]] — הסקיל שה-hook מפעיל
- [[cc-settings-local-json]] — הגדרות מקומיות (הרשאות) שמשלימות קובץ זה
- [[cc-launch-json]] — תצורת הרצה משלימה בתיקיית ‎.claude/‎
