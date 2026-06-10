# cashflow-pulse/src/screens/Dashboard.tsx

**שייך ל:** cashflow-pulse / שכבת ה-UI (מסכים)

## מה הקובץ עושה
מסך 1 — הדשבורד המרכזי ("הדופק"). מקבל את הכיס הנבחר כ-prop, שולף את נתוניו עם `useScope` ו-`useScopeData`, ומציג: כרטיס יתרה נוכחית, את `PulseGauge` (היתרה החזויה ל-10 בחודש וסטטוס בטוח/סכנה), את `FlowChart` (גרף התזרים היומי), ורשימת התנועות הצפויות עד יום היעד בלבד (מסונן לפי `result.targetDate`). מציג מצב "טוען…" עד שהנתונים מוכנים.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-state-use-data]] — מקור הנתונים והתחזית
- [[cf-src-components-pulse-gauge]] — ווידג'ט מדד ה-10
- [[cf-src-components-flow-chart]] — גרף התזרים
- [[cf-src-components-transaction-row]] — שורות התנועות הצפויות
- [[cf-src-lib-currency]] — עיצוב היתרה הנוכחית
- [[cf-src-app]] — מרנדר את המסך בלשונית dashboard
