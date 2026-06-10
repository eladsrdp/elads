# cashflow-pulse/src/state/useData.ts

**שייך ל:** cashflow-pulse / שכבת ה-state ‏(React hooks)

## מה הקובץ עושה
ה-hooks שמחברים את ה-DB למנוע התחזית באמצעות `useLiveQuery` של dexie-react-hooks (עדכון אוטומטי של ה-UI בכל שינוי בנתונים). `useScopes`/`useScope` שולפים כיסים; `useScopeData` הוא הלב — שולף את כל הנתונים של כיס, מפצל ל-actuals ול-forecasts מאוחסנים, מרחיב קבועים והעברות לחלון תצוגה של 62 יום (`DISPLAY_WINDOW_DAYS`), ממיין לפי תאריך, ומריץ את `computeForecast` עם יום יעד 10. מחזיר `ScopeData` עם actuals, forecasts ותוצאת התחזית — הדשבורד וספר התנועות בנויים עליו.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-db-db]] — מקור השאילתות החיות
- [[cf-src-engine-forecast]] — computeForecast / expandRecurring / expandTransfers
- [[cf-src-lib-date]] — todayISO ו-addDays לקביעת חלון התצוגה
- [[cf-src-screens-dashboard]] — צרכן עיקרי של useScopeData
- [[cf-src-screens-ledger]] — צרכן של actuals + forecasts
