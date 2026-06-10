# cashflow-pulse/src/engine/forecast.test.ts

**שייך ל:** cashflow-pulse / בדיקות (Vitest)

## מה הקובץ עושה
בדיקות יחידה למנוע התחזית. מכסה את `computeForecast` — יתרה שטוחה ללא תנועות, חריגה מתחת לאפס שמדליקה danger ומחשבת shortfall, מסגרת אשראי שמרככת את הצניחה, והתעלמות מתנועות actual (שכבר משוקללות ביתרה). בודק גם את `expandRecurring` ו-`expandTransfers`. רץ עם `npm test` (vitest run) בסביבת jsdom.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-engine-forecast]] — הקובץ הנבדק
- [[cf-vite-config]] — הגדרת סביבת הבדיקות של Vitest
- [[cf-src-vitest-setup]] — קובץ ה-setup שנטען לפני הבדיקות
