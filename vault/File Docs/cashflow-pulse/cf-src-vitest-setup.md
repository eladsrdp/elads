# cashflow-pulse/src/vitest-setup.ts

**שייך ל:** cashflow-pulse / בדיקות (תשתית)

## מה הקובץ עושה
קובץ setup חד-שורתי לבדיקות: מייבא את `@testing-library/jest-dom/vitest` כדי להוסיף matchers של jest-dom‏ (כמו toBeInTheDocument) ל-expect של Vitest. נטען אוטומטית לפני כל ריצת בדיקות דרך `setupFiles` ב-vite.config.ts.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-vite-config]] — מגדיר את הקובץ כ-setupFiles
- [[cf-src-engine-forecast-test]] — בדיקות שרצות עם ה-setup הזה
- [[cf-src-import-parse-statement-test]] — בדיקות שרצות עם ה-setup הזה
