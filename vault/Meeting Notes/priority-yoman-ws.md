# Priority — ממשק פקודות יומן (PCN874 Web Services)

## Overview
ממשק REST לקליטת פקודות יומן במערכת Priority ERP. כולל רשומת כותרת (PkudatYoman) ורשומות שורה (ShuratPkudatYoman). חלק מהשדות ייחודיים לדיווח PCN874 (מע"מ לרשות המיסים). הממשק בנוי על OData REST API של Priority.

## Open Questions
- מה שם הישות המדויקת ב-OData של הלקוח? (ייתכן PKUDATYOMAN במקום PCKUDATYOMAN)
- האם הלקוח משתמש ב-Basic Auth או Bearer Token?
- מה ה-ENV הנכון (`tabula.ini` / `priority.ini`)?

## Session Log

### 2026-06-16 — יצירת Postman Collection מקובץ DOC [shipped]
- **What was done:** קריאת קובץ .doc של מפרט ממשק פקודות יומן (OLE2 פורמט, חולץ ב-Word COM). מיפוי כל שדות PkudatYoman ו-ShuratPkudatYoman. יצירת Postman Collection עם 7 בקשות: POST שקלים, POST PCN874, POST מטבע זר, GET כותרות, GET פקודה ספציפית, PATCH, DELETE.
- **Decisions:** שמות השדות הועברו כ-UPPERCASE לפי נוהל Priority REST; שדות PCN874 שולבו בתוך שורת הפקודה (לא כותרת); תאריכים בפורמט ISO-8601 עם offset ישראלי.
- **Notes / Caveats:** שם הישות ב-OData עלול להיות שונה — יש לאמת מול שרת ה-Priority של הלקוח. הממשק דורש שכל פקודה מאוזנת (סה"כ חובה = סה"כ זכות).
- **Related:** [[priority-lite-app]]
