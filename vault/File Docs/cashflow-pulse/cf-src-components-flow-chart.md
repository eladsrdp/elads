# cashflow-pulse/src/components/FlowChart.tsx

**שייך ל:** cashflow-pulse / שכבת ה-UI (קומפוננטות, ויזואליזציה)

## מה הקובץ עושה
גרף שטח (AreaChart של Recharts) שמציג את היתרה החזויה יום-יום מהיום עד יום היעד. צבע הקו והמילוי נגזר מהסטטוס הכולל (ירוק/אדום), ציר ה-X מציג את היום בחודש, וקו ייחוס מקווקו אדום מסמן את סף החריגה (מינוס מסגרת האשראי). ה-tooltip בעברית (RTL) מציג את היתרה המעוצבת בש"ח לכל יום.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-screens-dashboard]] — המסך שמרנדר את הגרף
- [[cf-src-engine-forecast]] — נקודות התחזית (ForecastResult.points)
- [[cf-src-lib-currency]] — עיצוב הערכים ב-tooltip
- [[cf-package-json]] — התלות recharts מוגדרת שם
