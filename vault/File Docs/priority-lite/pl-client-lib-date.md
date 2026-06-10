# priority-lite/client/src/lib/date.ts

**שייך ל:** priority-lite / קליינט / עוזרים

## מה הקובץ עושה
עוזרי תאריך — כל התאריכים בפורמט YYYY-MM-DD מקומי (לא UTC, כדי שדיווח בלילה לא יקפוץ ליום אחר). כולל: toISODate / todayISO, ‏fmtClock ‏(HH:MM מ-timestamp), טווחי תאריכים rangeToday / rangeWeek (שבוע עבודה ישראלי — ראשון עד שבת) / rangeMonth, ו-fmtDateHe שמפרמט תאריך לתצוגה עברית ("יום שלישי, 10.6").

## קבצים קשורים
- [[pl-client-lib-date-test]] — בדיקות היחידה של הקובץ
- [[pl-client-screens-summary]] — משתמש בטווחי התאריכים
- [[pl-client-state-use-timer]] — משתמש ב-toISODate וב-fmtClock
- [[pl-client-components-entry-row]] — משתמש ב-fmtDateHe
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
