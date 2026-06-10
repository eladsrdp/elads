# cashflow-pulse/src/lib/date.ts

**שייך ל:** cashflow-pulse / ספריית עזר (תאריכים)

## מה הקובץ עושה
עזרי תאריך טהורים שעובדים על מחרוזות ISO‏ (YYYY-MM-DD) עם חישובים ב-UTC כדי להימנע מבעיות אזור זמן. כולל: המרות `toISO`/`parseISO`, חשבון ימים (`addDays`, `daysBetween`, `eachDayInclusive`), `todayISO` (היום לפי שעון מקומי), `nextTargetDate` (המופע הקרוב של יום היעד בחודש, עם הצמדה לסוף חודש קצר), ו-`occurrencesInWindow` (כל המופעים של יום-בחודש בטווח — הבסיס להרחבת קבועים והעברות). משמש את מנוע התחזית, ה-hooks והמסכים.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-engine-forecast]] — הצרכן העיקרי של פונקציות התאריך
- [[cf-src-state-use-data]] — משתמש ב-todayISO ו-addDays לחלון התצוגה
- [[cf-src-import-parse-statement]] — משתמש ב-toISO בפענוח תאריכים מקבצי בנק
