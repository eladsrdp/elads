# Skill — webenefit-invoice

## Overview
Skill ייעודי לקריאות בפועל מול WeBenefit Accounting API
(`https://wbnftapi.azurewebsites.net/weapi/v1`): בדיקת תוקף טוקן, חיפוש לקוח,
והוצאת חשבונית מס (single-line / multi-line). כל הקריאות דרך curl + Bearer
token, בדומה במבנה ל-[[skill-gpt-image-gen]]. משמש אך ורק את [[agent-noa]] —
ה-skill לא מחליט מה לשלוח ולא מציג טיוטה; זה תפקידה של נועה.

## Open Questions
- תמיכה ב-`POST /doc/add` (מסמך מלא, `type` חופשי כולל 300=חשבון עסקה) עדיין
  לא נבנתה — כרגע רק חשבונית מס (305/320) דרך ה-endpoints המהירים. ראה
  [[agent-noa]] לפרטים.

## קבצים משויכים

| קובץ | תיאור |
|------|--------|
| `.claude/skills/webenefit-invoice/SKILL.md` | הגדרת ה-skill — endpoints, curl, קודי pay_method, אימות פלט |

## Endpoints נתמכים

| Endpoint | שימוש |
|----------|-------|
| `GET /test/authuser` | בדיקת תוקף טוקן |
| `POST /client/search` | חיפוש לקוח לפי שם/taxId |
| `POST /doc/addinvoicequick` | חשבונית מס — שורה אחת |
| `POST /doc/addinvoicequickmultiline` | חשבונית מס — רב-שורתית |

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
