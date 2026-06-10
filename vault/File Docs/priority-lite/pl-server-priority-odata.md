# priority-lite/server/src/priority/odata.ts

**שייך ל:** priority-lite / שרת / אינטגרציית Priority

## מה הקובץ עושה
המימוש האמיתי של PriorityAdapter מול Priority REST API ‏(OData v4) עם Basic Auth. כולל תשתית עמידות: סמפור שמגביל ל-2 בקשות מקבילות (מגבלת פריוריטי), retry עם exponential backoff על 429/5xx, ‏timeout של 30 שניות לכל בקשה, ו-escaping של גרשים בערכי $filter. כיוון שה-OData של פריוריטי לא תומך ב-contains(), חיפוש משימות טוען את כל הפרויקטים (~300) למטמון של 5 דקות ומסנן מקומית — חיפוש עברי מיידי. ממיר דקות לשעות עשרוניות לפריוריטי ובחזרה, וקוטם הערות ל-60 תווים. createTask עדיין לא נתמך (זורק שגיאה מוסברת).

## קבצים קשורים
- [[pl-server-priority-adapter]] — הממשק שהקובץ מממש
- [[pl-server-priority-mapping]] — שמות הישויות והשדות שהקוד משתמש בהם
- [[pl-server-index]] — בוחר בו כש-PRIORITY_MODE=real
- [[pl-server-scripts-smoke]] — בדיקת עשן ידנית של המימוש
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
