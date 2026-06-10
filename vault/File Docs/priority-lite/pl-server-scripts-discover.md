# priority-lite/server/scripts/discover.ts

**שייך ל:** priority-lite / שרת / סקריפטים

## מה הקובץ עושה
סקריפט גילוי חד-פעמי (CLI) לשלב M6 — חיבור לפריוריטי אמיתי. שתי פקודות: `metadata` שולפת את ה-$metadata של שירות ה-OData ושומרת ל-priority-metadata.xml, ו-`sample <ENTITY> [top]` שולפת רשומות לדוגמה מישות נתונה כדי לראות שמות שדות אמיתיים. קורא את פרטי החיבור ממשתני סביבה (PRIORITY_BASE_URL/COMPANY/USER/PASSWORD), נכשל עם הודעה ברורה אם חסרים, ובמכוון לא מדפיס credentials.

## קבצים קשורים
- [[pl-server-priority-metadata-xml]] — הפלט של פקודת metadata
- [[pl-server-priority-mapping]] — המיפוי שממלאים על סמך הממצאים
- [[pl-server-env-example]] — משתני הסביבה הנדרשים
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
