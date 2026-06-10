# cashflow-pulse/src/components/PulseGauge.tsx

**שייך ל:** cashflow-pulse / שכבת ה-UI (קומפוננטות)

## מה הקובץ עושה
ווידג'ט "מדד ה-10" — הכרטיס המרכזי בדשבורד. מקבל `ForecastResult` ומציג את היתרה החזויה ליום היעד בגדול, תג סטטוס "בטוח"/"סכנת חריגה", ומשפט הסבר: כמה כסף חסר לעבור את יום היעד בשלום (shortfall) או אישור שהכל תקין, וכמה ימים נותרו. כל הצבעוניות (ירוק emerald / אדום rose) נגזרת מהסטטוס.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-screens-dashboard]] — המסך שמרנדר את הווידג'ט
- [[cf-src-engine-forecast]] — מקור ה-ForecastResult המוצג
- [[cf-src-lib-currency]] — עיצוב הסכומים
- [[cf-src-types]] — הטיפוס ForecastResult
