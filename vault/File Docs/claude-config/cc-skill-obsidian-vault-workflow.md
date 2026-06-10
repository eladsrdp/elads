# .claude/skills/obsidian-vault-workflow/

**שייך ל:** תצורת Claude Code / סקילים

## מה הקובץ עושה
סקיל שאוכף את פרוטוקול הקריאה/כתיבה החובה ב-vault של הפרויקט (`vault/`), המשמש כזיכרון ארוך-הטווח של Claude Code. בתחילת כל משימה: לזהות את הנושא, לאתר ולקרוא את קובץ הנושא (Overview + Session Log) ואת ההקשר העדכני (Meeting Notes, Content Briefs, Brand Guidelines). בסיום כל משימה: להוסיף סיכום compact מתוארך לקובץ הנושא ולעדכן את ה-Overview אם ההיקף השתנה. ה-vault מאורגן בקובץ אחד לכל נושא. הסקיל מופעל אוטומטית דרך ה-hook ב-settings.json.

קבצים פנימיים:
- `SKILL.md` — שלבי הפרוטוקול (לפני ואחרי משימה), מוסכמות התיקיות וכללי הכתיבה.

## קבצים קשורים
- [[cc-settings-json]] — ה-hook שמפעיל סקיל זה בכל הגשת prompt
- [[cc-skill-obsidian-markdown]] — תחביר הכתיבה ב-vault
- [[cc-skill-obsidian-bases]] — תצוגות מסד-נתונים מעל ה-vault
- [[skills-obsidian]] — קבוצת סקילי אובסידיאן ב-vault
