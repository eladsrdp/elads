# נועה — מזכירת החשבוניות (WeBenefit)

## Overview
נועה היא סוכן חדש בצוות (`.claude/agents/noa.md`) שמוציא חשבוניות מס בפועל
מול **WeBenefit Accounting API** (`https://wbnftapi.azurewebsites.net`), מתוך
תיאור חופשי בשיחה (לקוח, סכום/פריטים, שירות). ה-API עצמו הוא הוצאת חשבוניות
מס מהירות (single/multi-line) + חיפוש לקוחות, מתועד ב-
`https://webenefit-main-api.readme.io/`. הקריאות בפועל עטופות ב-skill נפרד
`.claude/skills/webenefit-invoice/SKILL.md` (curl + Bearer token מ-`.env`,
בדומה למבנה `skill-gpt-image-gen`).

**עקרון הליבה:** הוצאת חשבונית היא פעולה כספית/משפטית בלתי הפיכה (מדווחת
לרשויות המס) — לכן נועה **חייבת** להציג טיוטה מלאה ולקבל אישור מפורש של
המשתמש לפני כל קריאה בפועל ל-API. אין fallback אוטומטי ואין "תיקון שקט" של
נתונים בין ניסיונות.

## Open Questions
- **סוג המסמך:** ה-endpoints המהירים (`doc/addinvoicequick`,
  `addinvoicequickmultiline`) מפיקים **חשבונית מס** (קוד מסמך 305/320), **לא
  חשבון עסקה** (קוד 300). אם המשתמש צריך חשבון עסקה אמיתי — צריך לבנות תמיכה
  ב-endpoint הנפרד `POST /doc/add` עם `type: 300` (דורש שדות נוספים: `date`,
  `client` object מלא, `income[]` עם `vatType` וכו'). זה עדיין לא בנוי ב-skill.
- מספר עוסק/ת.ז. (`taxId`) של לקוחות שלא רשומים ב-WeBenefit לא נשלף אוטומטית —
  צריך לבקש מהמשתמש ידנית כשהסכום ≥5,000 ₪.
- אין endpoint ל-refresh token מתועד — אם הטוקן יפוג, הפתרון היחיד הידוע הוא
  לפנות מחדש ל-info@webenefit.co.il.

## Session Log

### 2026-07-29 — בניית נועה + webenefit-invoice skill [wip]
- **What was done:** מחקר מלא של WeBenefit API (auth, endpoints, שדות,
  קודי pay_method, מטבעות, קודי סוגי מסמכים) דרך readme.io + llms.txt index.
  נבנה סוכן `noa.md` (זרימת עבודה: פרק בקשה → חיפוש לקוח → טיוטה → אישור
  מפורש → שליחה → לוג) ו-skill `webenefit-invoice` (curl wrappers ל-
  test/authuser, client/search, addinvoicequick, addinvoicequickmultiline).
  נוסף `WEBENEFIT_ACCESS_TOKEN` ל-`.env`/`.env.example`. נבדק טוקן בפועל מול
  `test/authuser` — הצליח (200). עודכן ניתוב ב-CLAUDE.md + לוג ריק
  `noa/Memory/invoices-log.md`.
- **Decisions:** אישור מפורש לפני כל שליחה הוא כלל ברזל, ללא יוצא מן הכלל
  (המשתמש עצמו ביקש את זה, בגלל אופי המסמך הבלתי הפיך). ברירת מחדל מע"מ:
  עוסק מורשה (`vat_exempt: false`). חיפוש לקוח תמיד דרך WeBenefit
  (`client/search`), לא מאגר מקומי — כדי לא לשמור עותק כפול/לא מסונכרן של
  נתוני לקוחות. מספרי עוסק/ת.ז. בלוג המקומי תמיד מוסתרים חלקית (הגנת פרטיות,
  גם ל-B2B).
- **Notes / Caveats:** בניסיון בדיקה ראשון (חשבון עסקה של 1 ₪ ללקוח "רותם
  זילברמן") התגלו שני דברים: (1) חיפוש לקוח עם `-d` inline דרך Git Bash
  ב-Windows שולח עברית בקידוד שגוי → `400 Bad Request`; התיקון (כבר יושם
  ב-SKILL.md) הוא לכתוב את גוף הבקשה לקובץ עם ה-Write tool ולשלוח עם
  `--data-binary @file`. (2) המשתמש ביקש במפורש "חשבון עסקה", אבל ה-endpoint
  המהיר מפיק "חשבונית מס" — מסמך משפטי שונה. המשתמש בחר לוותר על אותו ניסיון
  ספציפי במקום להמשיך עם המסמך הלא-נכון — **שום חשבונית לא הופקה בפועל**.
  כמו כן, curl דרש `--ssl-revoke-best-effort` בגלל שגיאת schannel/OCSP
  (Windows) — לא קשור לאבטחת TLS עצמה, רק לבדיקת revocation מול שרת חיצוני.
- **Related:** [[agent-chen]], [[skill-gpt-image-gen]], [[env-config]],
  [[agent-reuven]]
