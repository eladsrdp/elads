# Skill — webenefit-invoice

## Overview
Skill ייעודי לקריאות בפועל מול WeBenefit Accounting API
(`https://wbnftapi.azurewebsites.net/weapi/v1`): בדיקת תוקף טוקן, חיפוש לקוח,
הוצאת חשבונית מס מהירה (single-line / multi-line), יצירת **כל סוג מסמך**
(חשבון עסקה, קבלה, זיכוי, ריכוז וכו') דרך ה-endpoint המלא `doc/add`, ואיתור
מסמכים קיימים (`doc/list`/`doc/find`). כל הקריאות דרך curl + Bearer token,
בדומה במבנה ל-[[skill-gpt-image-gen]]. משמש אך ורק את [[agent-noa]] —
ה-skill לא מחליט מה לשלוח ולא מציג טיוטה; זה תפקידה של נועה.

## Open Questions
- `POST /doc/add` נבנה מהתיעוד בלבד — **עדיין לא נבדק מול קריאה אמיתית**.
  יש לאמת שהשדות/enum-ים (`vatType`, `dealType`, `cardType`) תואמים בפועל.
- אין שדה API מתועד לקישור זיכוי (330) או קבלה (400) למסמך מקורי — פתרון
  זמני: הפניה טקסטואלית ב-`description` בלבד. ראה [[agent-noa]] לפרטים.

## קבצים משויכים

| קובץ | תיאור |
|------|--------|
| `.claude/skills/webenefit-invoice/SKILL.md` | הגדרת ה-skill — endpoints, curl, קודי pay_method/vatType/dealType, טבלת סוגי מסמכים, אימות פלט |

## Endpoints נתמכים

| Endpoint | שימוש |
|----------|-------|
| `GET /test/authuser` | בדיקת תוקף טוקן |
| `POST /client/search` | חיפוש לקוח לפי שם/taxId |
| `POST /doc/addinvoicequick` | חשבונית מס — שורה אחת (מסלול מהיר) |
| `POST /doc/addinvoicequickmultiline` | חשבונית מס — רב-שורתית (מסלול מהיר) |
| `POST /doc/add` | **כל סוג מסמך** — `type` חופשי (300/305/310/320/330/340/400/405/600 וכו') |
| `POST /doc/list` | חיפוש מסמכים קיימים (למניעת כפילות / איתור מסמך לזיכוי) |
| `GET /doc/find/{id}` | שליפת מסמך בודד לפי id |

## תלויות ואזהרות
- `WEBENEFIT_ACCESS_TOKEN` ב-`.env` — ראה [[env-config]]
- `curl` בסביבת ריצה, עם `--ssl-revoke-best-effort` (נדרש ב-Windows schannel;
  לא מבטל אימות SSL, רק בדיקת revocation מול OCSP חיצוני)
- **קריטי:** גוף בקשה עם עברית (שם לקוח, תיאור מוצר) חייב להישלח דרך קובץ +
  `--data-binary @file`, לא `-d` inline — אחרת קידוד שגוי גורם ל-`400 Bad Request`
  שקטה (נתגלה בפועל ב-2026-07-29, ראה [[agent-noa]])

## Session Log

### 2026-07-29 — יצירה ראשונית [shipped]
- **What was done:** נבנה ה-skill מול תיעוד ה-API (readme.io), עם curl wrappers לארבעת ה-endpoints שלמעלה.
- **Decisions:** גוף בקשה תמיד דרך קובץ זמני (לא inline) — נדרש כדי לתמוך בעברית נכון.
- **Notes / Caveats:** `POST /doc/add` (מסמך מלא, כל סוגי המסמכים) לא נתמך עדיין.
- **Related:** [[agent-noa]], [[env-config]], [[skill-gpt-image-gen]]

### 2026-07-29 — הרחבה ל-doc/add וכל סוגי המסמכים [wip]
- **What was done:** נוספו סעיפים 5-7 ל-`SKILL.md`: `POST /doc/add` (schema
  מלא — `client`/`income[]`/`payment[]`, enum-ים `vatType`/`cardType`/
  `dealType`), טבלת קודי סוגי מסמכים (10 עד 35000), `POST /doc/list` ו-
  `GET /doc/find/{id}` לאיתור מסמכים קיימים.
- **Decisions:** `payment[].type` מניח שימוש באותם קודי `pay_method` כמו
  ה-endpoints המהירים (שניהם מוזנים מאותו Reference Data ב-API) — לא אושר
  במפורש בתיעוד, יש לאמת אם מתקבלת שגיאה. זיכוי/קבלה על מסמך קיים — הפניה
  טקסטואלית ב-`description` בלבד, כי אין שדה קישור מתועד.
- **Notes / Caveats:** `doc/add` עדיין לא נבדק מול קריאה אמיתית ל-API.
- **Related:** [[agent-noa]]
