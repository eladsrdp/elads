# cashflow-pulse/src/components/TransactionRow.tsx

**שייך ל:** cashflow-pulse / שכבת ה-UI (קומפוננטות)

## מה הקובץ עושה
שורת תנועה בודדת ברשימות: תיבת תאריך (יום/חודש), תיאור, תווית מקור בעברית (ידני/יובא/קבוע/העברה) והסכום עם סימן מפורש — הכנסות בירוק. מקבלת callbacks אופציונליים `onConfirm` (✓ לאישור תנועה צפויה שבוצעה) ו-`onDelete` (✕), והכפתורים מוצגים רק כשה-callback סופק. משמשת גם בדשבורד וגם בספר התנועות.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-screens-dashboard]] — מציג שורות צפויות לקריאה בלבד
- [[cf-src-screens-ledger]] — מציג שורות עם אישור ומחיקה
- [[cf-src-lib-currency]] — formatSigned לעיצוב הסכום
- [[cf-src-types]] — הטיפוס Transaction ותוויות המקור
