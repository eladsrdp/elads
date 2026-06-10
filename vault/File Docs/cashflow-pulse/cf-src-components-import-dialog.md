# cashflow-pulse/src/components/ImportDialog.tsx

**שייך ל:** cashflow-pulse / שכבת ה-UI (קומפוננטות, ייבוא)

## מה הקובץ עושה
דיאלוג ייבוא תנועות בשלושה שלבים: בחירת קובץ Excel/CSV (‏xlsx/xls/csv), מיפוי עמודות — המשתמש בוחר אילו עמודות הן תאריך/תיאור/סכום (עם ניחוש ראשוני: עמודה ראשונה תאריך, אחרונה סכום) ואפשרות היפוך סימן, ולבסוף ייבוא בפועל והצגת סיכום (כמה יובאו, כמה כפילויות דולגו, כמה שורות לא תקינות). הפענוח נעשה ב-`parseStatement` והכתיבה ל-DB ב-`importTransactions` עם דה-דופליקציה.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-import-parse-statement]] — readSheet / rowsToTransactions לפענוח הקובץ
- [[cf-src-db-operations]] — importTransactions לשמירה עם דילוג כפילויות
- [[cf-src-components-modal]] — מעטפת הדיאלוג
- [[cf-src-components-forms]] — Field / Select / PrimaryButton
- [[cf-src-screens-ledger]] — המסך שפותח את הדיאלוג
