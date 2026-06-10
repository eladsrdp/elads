# priority-lite/server/scripts/report.ts

**שייך ל:** priority-lite / שרת / סקריפטים

## מה הקובץ עושה
סקריפט CLI להפקת דוח שעות מפריוריטי האמיתי — קריאה בלבד. בלי פרמטרים מציג את 7 הימים האחרונים; אפשר להעביר טווח (`npx tsx scripts/report.ts 2026-06-01 2026-06-07`). מתחבר דרך ה-adapter עם credentials מ-.env, מושך את דיווחי העובד (`SMOKE_EMP`, ברירת מחדל elads), ומדפיס פירוט לפי יום, סיכום לפי פרויקט, וסה"כ. שימש לאימות הראשון של קריאה אמיתית מפריוריטי (2026-06-10).

## קבצים קשורים
- [[pl-server-priority-odata]] — ה-adapter שדרכו רצה השאילתה
- [[pl-server-priority-mapping]] — שמות הישויות והשדות
- [[pl-server-scripts-smoke]] — סקריפט בדיקת עשן מקביל (read/write)
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
