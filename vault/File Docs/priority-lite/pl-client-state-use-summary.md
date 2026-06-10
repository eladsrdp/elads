# priority-lite/client/src/state/useSummary.ts

**שייך ל:** priority-lite / קליינט / state

## מה הקובץ עושה
סיכומי שעות לפי טווח תאריכים — מחושב כולו מקומית מ-Dexie (טיוטות + מסונכרנים יחד). `summarize` מקבץ דיווחים לפי משימה ואז לפי פרויקט, סופר סה"כ דקות ודקות שעדיין בטיוטה, וממיין פרויקטים ומשימות מהגדול לקטן. `useRangeSummary` הוא ה-hook הריאקטיבי שמריץ זאת על כל הדיווחים בטווח נתון.

## קבצים קשורים
- [[pl-client-db]] — מקור הנתונים
- [[pl-client-screens-summary]] — המסך שמציג את התוצאה
- [[pl-client-types]] — טיפוס LocalTimeEntry
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
