# cashflow-pulse/src/screens/Bridge.tsx

**שייך ל:** cashflow-pulse / שכבת ה-UI (מסכים)

## מה הקובץ עושה
מסך 3 — גשר ההעברות בין הכיסים. טופס להגדרת העברה חודשית קבועה: כיוון (עסק→בית או בית→עסק), סכום, יום בחודש ותיאור. ההעברה נשמרת בטבלת `transfers`, ומנוע התחזית מרחיב אותה אוטומטית לזוג תנועות forecast — הוצאה בכיס המקור והכנסה בכיס היעד. בנוסף מציג את רשימת ההעברות הקיימות (דרך `useLiveQuery` ישירות על ה-DB) עם אפשרות מחיקה.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-db-operations]] — addTransfer / deleteTransfer
- [[cf-src-db-db]] — שאילתת ההעברות החיה
- [[cf-src-engine-forecast]] — expandTransfers שממיר העברות לתנועות חזויות
- [[cf-src-components-forms]] — שדות הטופס
- [[cf-src-lib-currency]] — עיצוב סכומי ההעברות
