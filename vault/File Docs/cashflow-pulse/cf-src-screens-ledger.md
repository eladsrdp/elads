# cashflow-pulse/src/screens/Ledger.tsx

**שייך ל:** cashflow-pulse / שכבת ה-UI (מסכים)

## מה הקובץ עושה
מסך 2 — ספר התנועות. שתי לשוניות פנימיות: "מה שצפוי לרדת" (forecasts, כולל תנועות שנוצרו מקבועים והעברות) ו"מה שכבר ירד" (actuals, ממוין מהחדש לישן). מציע שתי פעולות ראשיות: הוספת תנועה צפויה ידנית דרך `AddForecastModal` פנימי (סוג הוצאה/הכנסה, סכום, תאריך, תיאור), וייבוא קובץ דרך `ImportDialog`. שורות forecast מאוחסנות ניתנות לאישור (`confirmTransaction`) ושורות ידניות גם למחיקה; תנועות שנוצרו דינמית מקבועים/העברות (ללא id) אינן ניתנות לפעולה.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-state-use-data]] — actuals ו-forecasts של הכיס
- [[cf-src-db-operations]] — addTransaction / confirmTransaction / deleteTransaction
- [[cf-src-components-transaction-row]] — רינדור כל שורה עם כפתורי אישור/מחיקה
- [[cf-src-components-import-dialog]] — דיאלוג ייבוא הקבצים
- [[cf-src-components-modal]] — בסיס המודאל של טופס ההוספה
- [[cf-src-components-forms]] — שדות הטופס (Field, TextInput, Select, PrimaryButton)
