# cashflow-pulse/src/engine/forecast.ts

**שייך ל:** cashflow-pulse / מנוע התחזית (לוגיקה טהורה)

## מה הקובץ עושה
הליבה של האפליקציה — פונקציות טהורות ללא תלות ב-UI או ב-DB. `computeForecast` מחשבת את היתרה החזויה יום-יום מהיום ועד יום היעד (ברירת מחדל ה-10 בחודש): יתרה נוכחית + סכימת תנועות forecast בטווח, ומחזירה `ForecastResult` עם סטטוס safe/danger (חריגה מתחת ל-מינוס מסגרת האשראי), shortfall (הפער העמוק ביותר מתחת לסף) וימים שנותרו. בנוסף, `expandRecurring` ו-`expandTransfers` מרחיבות הגדרות קבועים והעברות לתנועות forecast קונקרטיות בתוך חלון תאריכים — העברה מתורגמת לזוג תנועות מקושרות (הוצאה במקור, הכנסה ביעד).

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-types]] — טיפוסי הקלט והפלט (ForecastResult, Transaction וכו')
- [[cf-src-lib-date]] — חישובי התאריכים (nextTargetDate, occurrencesInWindow ועוד)
- [[cf-src-state-use-data]] — ה-hook שמזין את המנוע בנתונים מה-DB
- [[cf-src-engine-forecast-test]] — בדיקות היחידה של המנוע
