# priority-lite/client/src/screens/Settings.tsx

**שייך ל:** priority-lite / קליינט / מסכים

## מה הקובץ עושה
מסך "הגדרות" — מציג את פרטי המשתמש המחובר (שם, טלפון, מספר עובד בפריוריטי), את מצב המערכת מ-`/api/health` (חיבור אמיתי לפריוריטי או mock לפיתוח — עם אינדיקציה צבעונית) ואת מספר הדיווחים השמורים מקומית ב-Dexie, וכן כפתור התנתקות.

## קבצים קשורים
- [[pl-client-state-use-auth]] — פרטי המשתמש וההתנתקות
- [[pl-server-app]] — נקודת ה-health שהמסך שואל
- [[pl-client-db]] — ספירת הדיווחים המקומיים
- [[pl-client-components-forms]] — כפתור ה-DangerButton
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
