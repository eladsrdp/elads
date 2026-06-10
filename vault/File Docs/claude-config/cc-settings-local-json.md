# .claude/settings.local.json

**שייך ל:** תצורת Claude Code / הגדרות

## מה הקובץ עושה
קובץ הגדרות מקומי (לא משותף) המכיל רשימת הרשאות (`permissions.allow`) שאושרו במחשב המפתח. ההרשאות כוללות פקודות יצירת תיקיות תחת `.claude/` (agents, skills, commands), קריאות `gh api`, ושני דומיינים מאושרים ל-WebFetch (`api.github.com`, `raw.githubusercontent.com`). מטרתו לצמצם בקשות אישור חוזרות עבור פעולות שגרתיות בפרויקט. הקובץ אינו מכיל סודות — רק דפוסי הרשאה.

## קבצים קשורים
- [[cc-settings-json]] — קובץ ההגדרות המשותף שקובץ זה משלים
- [[cc-launch-json]] — תצורת הרצה משלימה בתיקיית ‎.claude/‎
