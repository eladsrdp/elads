# cashflow-pulse/src/lib/currency.ts

**שייך ל:** cashflow-pulse / ספריית עזר (עיצוב מטבע)

## מה הקובץ עושה
עיצוב סכומים בש"ח באמצעות `Intl.NumberFormat` עם לוקאל he-IL וללא ספרות אחרי הנקודה. חושף שתי פונקציות: `formatCurrency` ("₪5,000") לתצוגת יתרות, ו-`formatSigned` ("+₪5,000" / "−₪3,000") לתנועות שבהן הסימן חשוב. משמש כמעט בכל קומפוננטת תצוגה באפליקציה.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-components-pulse-gauge]] — מציג יתרה חזויה ו-shortfall מעוצבים
- [[cf-src-components-transaction-row]] — מציג סכומי תנועות עם formatSigned
- [[cf-src-components-flow-chart]] — מעצב ערכים ב-tooltip של הגרף
- [[cf-src-screens-dashboard]] — מציג את היתרה הנוכחית
