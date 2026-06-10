# priority-lite/server/src/priority/mock.ts

**שייך ל:** priority-lite / שרת / אינטגרציית Priority

## מה הקובץ עושה
מימוש מדומה של PriorityAdapter — מאפשר פיתוח ובדיקות מלאות בלי חיבור לפריוריטי. מחזיק בזיכרון 5 פרויקטים ו-20 משימות לדוגמה (בעברית, עם שמות גנריים ולא נתוני לקוחות אמיתיים), ושומר דיווחי שעות שנוצרים במהלך הריצה. מדמה latency של רשת (150–500ms) וכשלים אקראיים לפי MOCK_FAIL_RATE כדי לבדוק את ה-UI של שגיאות. מימוש חיפוש זהה בהתנהגות לזה של ה-odata adapter (סינון לפי שם/פרויקט/מזהה).

## קבצים קשורים
- [[pl-server-priority-adapter]] — הממשק שהקובץ מממש
- [[pl-server-index]] — בוחר בו כש-PRIORITY_MODE=mock
- [[pl-server-test-actions]] — הבדיקות רצות מולו
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
