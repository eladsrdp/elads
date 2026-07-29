# נועה — מזכירת החשבוניות (WeBenefit)

## Overview
נועה היא סוכן חדש בצוות (`.claude/agents/noa.md`) שמוציא **כל סוג מסמך
חשבונאי** בפועל מול **WeBenefit Accounting API**
(`https://wbnftapi.azurewebsites.net`), מתוך תיאור חופשי בשיחה (לקוח,
סכום/פריטים, שירות, וסוג מסמך). תומכת בחשבונית מס מהירה (single/multi-line)
דרך `doc/addinvoicequick(multiline)`, וב**כל שאר סוגי המסמכים** (חשבון עסקה,
קבלה, חשבונית זיכוי, ריכוז, הצעת מחיר וכו') דרך ה-endpoint המלא `POST
/doc/add` עם `type` מתאים — ראה טבלת קודים ב-`SKILL.md`. חיפוש לקוחות
(`client/search`) ואיתור מסמכים קיימים (`doc/list`/`doc/find`) גם נתמכים.
ה-API עצמו מתועד ב-`https://webenefit-main-api.readme.io/`. הקריאות בפועל
עטופות ב-skill נפרד `.claude/skills/webenefit-invoice/SKILL.md` (curl +
Bearer token מ-`.env`, בדומה למבנה `skill-gpt-image-gen`).

**עקרון הליבה:** הוצאת חשבונית היא פעולה כספית/משפטית בלתי הפיכה (מדווחת
לרשויות המס) — לכן נועה **חייבת** להציג טיוטה מלאה ולקבל אישור מפורש של
המשתמש לפני כל קריאה בפועל ל-API. אין fallback אוטומטי ואין "תיקון שקט" של
נתונים בין ניסיונות.

## Open Questions
- **`doc/add` עדיין לא נבדק מול ה-API בפועל** (רק `test/authuser` ו-
  `client/search` נבדקו עם קריאה אמיתית). יש לוודא בהוצאה אמיתית ראשונה של
  כל סוג מסמך (חשבון עסקה, קבלה, זיכוי) שהשדות/enum-ים (`vatType`,
  `dealType`, `cardType`) תואמים למה שמתועד.
- **זיכוי (330) וקבלה על חשבונית קיימת:** ה-API לא מתעד שדה קישור פורמלי בין
  מסמך חדש למסמך מקורי. הפתרון הזמני (מיושם ב-`noa.md`) הוא הפניה טקסטואלית
  ב-`description` בלבד + ציון מפורש למשתמש שזו לא הפניה מובנית. כדאי לאמת
  מול WeBenefit support אם קיים שדה ייעודי שפוספס בתיעוד.
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

### 2026-07-29 — הרחבה לכל סוגי המסמכים [wip]
- **What was done:** בעקבות בקשת המשתמש להרחיב מעבר לחשבונית מס בלבד, נחקר
  לעומק ה-endpoint `POST /doc/add` (schema מלא: `client` object, `income[]`
  עם `vatType`, `payment[]` עם `cardType`/`dealType`, טבלת קודי `type` לכל
  סוגי המסמכים) + `doc/list`/`doc/find` לאיתור מסמכים קיימים. עודכן
  `SKILL.md` עם סעיפים חדשים (5-7) וטבלת סוגי מסמכים. עודכן `noa.md`: זיהוי
  סוג מסמך מהניסוח החופשי, טבלת מיפוי ניסוח→קוד, ניתוב בין המסלול המהיר
  (חשבונית מס פשוטה) ל-`doc/add` (כל השאר), וטיפול מיוחד בזיכוי/קבלה על
  מסמך קיים.
- **Decisions:** נשמר המסלול המהיר (`addinvoicequick`) לחשבונית מס פשוטה
  כי הוא כבר נבדק ועובד; `doc/add` משמש לכל סוג מסמך אחר ולמקרים שדורשים
  `client` object מורחב. עבור זיכוי/קבלה על מסמך — הפניה טקסטואלית בלבד
  ב-`description`, עם גילוי מלא למשתמש בטיוטה שזו לא הפניה מובנית במערכת
  (אין שדה API לכך).
- **Notes / Caveats:** `doc/add` נבנה מהתיעוד בלבד — עדיין לא נבדק מול קריאה
  אמיתית ל-API (ראה Open Questions). יש לאמת עם הרצה זהירה (טיוטה + אישור)
  לפני הסתמכות מלאה על סוגי המסמכים החדשים.
- **Related:** [[skill-webenefit-invoice]]
