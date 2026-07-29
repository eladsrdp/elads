---
name: webenefit-invoice
description: >
  Wrapper לקריאות ל-WeBenefit Accounting API (https://wbnftapi.azurewebsites.net) —
  חיפוש לקוח, בדיקת תוקף טוקן, הוצאת חשבונית מס מהירה (single/multi-line),
  ויצירת כל סוג מסמך חשבונאי (חשבון עסקה, קבלה, זיכוי, ריכוז ועוד) דרך
  ה-endpoint המלא. משמש את נועה (מזכירת החשבוניות). דורש WEBENEFIT_ACCESS_TOKEN
  מ-.env.
---

# webenefit-invoice — קריאות ל-WeBenefit Accounting API

Skill זה עוטף את קריאות ה-API בפועל מול WeBenefit. הוא **לא** מחליט מה לשלוח
ולא מציג טיוטה למשתמש — זה תפקידה של נועה. ה-skill רק מריץ את הקריאה שנועה
כבר אישרה מול המשתמש.

---

## טוקן

ה-skill משתמש ב-`WEBENEFIT_ACCESS_TOKEN` מקובץ `.env` בשורש הפרויקט.
טען אותו לסביבה לפני כל קריאה (Git Bash):

```bash
set -a; source .env; set +a
```

אם הטוקן חסר או ריק — עצור ודווח שצריך למלא `WEBENEFIT_ACCESS_TOKEN` ב-`.env`
(מתקבל מ-WeBenefit דרך info@webenefit.co.il, אין self-service).

**⚠️ לעולם אל תדפיס/תרשום את הטוקן** — לא בפלט, לא בלוג, לא בהודעת שגיאה.

### הערת רשת (Windows / curl schannel)
בסביבת Windows עם curl מבוסס schannel, ייתכן שתקבל שגיאת
`CRYPT_E_NO_REVOCATION_CHECK`. זו לא כשל אימות תעודה — זה רק כשל בבדיקת
תוקף/ביטול מול שרת OCSP חיצוני (בעיית רשת, לא בעיית אבטחה). התיקון: הוסף את
הדגל `--ssl-revoke-best-effort` לכל קריאת curl. הדגל **לא** מבטל אימות SSL —
התעודה עדיין מאומתת באופן מלא; הוא רק אומר ל-curl להמשיך אם בדיקת ה-revocation
עצמה נכשלה בגלל בעיית רשת. **אל תשתמש ב-`-k`/`--insecure` בשום מקרה.**

---

## Base URL

```
https://wbnftapi.azurewebsites.net/weapi/v1
```

---

## 1. בדיקת תוקף טוקן — `GET /test/authuser`

הרץ פעם אחת לפני השימוש הראשון (או אחרי שגיאת 401), כדי לאמת שהטוקן תקף:

```bash
set -a; source .env; set +a
curl -sS --ssl-revoke-best-effort \
  -o /tmp/webenefit_authuser.json -w "HTTP_STATUS:%{http_code}\n" \
  "https://wbnftapi.azurewebsites.net/weapi/v1/test/authuser" \
  -H "Authorization: Bearer $WEBENEFIT_ACCESS_TOKEN"
cat /tmp/webenefit_authuser.json
```

`HTTP_STATUS:200` = הטוקן תקף. `401` = טוקן לא תקף/פג — יש לפנות ל-WeBenefit.

---

## 2. חיפוש לקוח — `POST /client/search`

חיפוש לפי שם (התאמה חלקית), אימייל, taxId (מספר עוסק/ת.ז.), או שילוב.

**⚠️ חובה לכתוב את גוף הבקשה לקובץ ולשלוח עם `--data-binary @file`, לא `-d`
inline.** נבדק בפועל: שם לקוח בעברית שמועבר inline דרך `-d '{"name": "..."}'`
ב-Git Bash על Windows עובר קידוד שגוי ומחזיר `400 Bad Request` ("ארעה שגיאה")
— לא שגיאת נתונים אמיתית, אלא בעיית encoding. כתיבה לקובץ עם ה-tool `Write`
(UTF-8 תקין) ואז `--data-binary @file` פותרת את זה.

```bash
# כתוב את הגוף (JSON) לקובץ בסקראצ'פד עם ה-Write tool, לדוגמה לנתיב:
# <SCRATCHPAD>/wb_search.json  עם תוכן:  {"name": "<שם הלקוח>", "page": 1, "pageSize": 20}

set -a; source .env; set +a
curl -sS --ssl-revoke-best-effort \
  -o /tmp/webenefit_client_search.json -w "HTTP_STATUS:%{http_code}\n" \
  -X POST "https://wbnftapi.azurewebsites.net/weapi/v1/client/search" \
  -H "Authorization: Bearer $WEBENEFIT_ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary "@<SCRATCHPAD>/wb_search.json"
cat /tmp/webenefit_client_search.json
```

- 0 תוצאות → אין לקוח כזה ב-WeBenefit. נועה תבקש מהמשתמש taxId ידני.
- 1 תוצאה → זה הלקוח; שלוף ממנו את מספר העוסק/ת.ז. (`taxId`).
- 2+ תוצאות → נועה **חייבת** להציג את הרשימה למשתמש ולבקש לבחור. אסור לבחור אוטומטית.

---

## 3. חשבונית מס — שורה אחת — `POST /doc/addinvoicequick`

**רק אחרי שנועה הציגה טיוטה מלאה והמשתמש אישר במפורש.**

**⚠️ כמו בסעיף 2 — כתוב את גוף הבקשה לקובץ (עברית ב-`product_name`/
`invoice_desc` תעבור קידוד שגוי אם נשלחת inline דרך `-d`) ושלח עם
`--data-binary @file`.**

```bash
# כתוב לקובץ בסקראצ'פד, לדוגמה <SCRATCHPAD>/wb_invoice.json, עם תוכן:
# {
#   "product_name": "<תיאור השירות/מוצר>",
#   "sum_payed": <סכום כולל מע"מ>,
#   "recipient_id_number": "<מספר עוסק/ת.ז. של הלקוח, אם ידוע>",
#   "vat_exempt": false,
#   "pay_method": <קוד תשלום, ראה טבלה למטה>,
#   "payment_desc": "<פרטי תשלום, אופציונלי>",
#   "invoice_desc": "<הערה לחשבונית, אופציונלי>",
#   "currency": "ILS"
# }

set -a; source .env; set +a
curl -sS --ssl-revoke-best-effort \
  -o /tmp/webenefit_invoice.json -w "HTTP_STATUS:%{http_code}\n" \
  -X POST "https://wbnftapi.azurewebsites.net/weapi/v1/doc/addinvoicequick" \
  -H "Authorization: Bearer $WEBENEFIT_ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary "@<SCRATCHPAD>/wb_invoice.json"
cat /tmp/webenefit_invoice.json
```

**שדות:**

| שדה | חובה? | הערה |
|-----|-------|------|
| `product_name` | כן | תיאור המוצר/שירות |
| `sum_payed` | כן | סכום כולל מע"מ |
| `recipient_id_number` | חובה אם `sum_payed` ≥ 5,000 ₪ | מספר עוסק/ת.ז. |
| `vat_exempt` | לא (default `false`) | `true` רק אם הלקוח/העסקה פטורים ממע"מ |
| `pay_method` | לא | ראה טבלת קודים למטה — **אל תשתמש ב-default סמוי, בקש/אשר עם המשתמש** |
| `currency` | לא (default `ILS`) | ILS, USD, EUR, GBP ועוד (26 קודים נתמכים) |

**תגובת הצלחה (200):** `{ "id", "number", "signed", "url", "urlHe", "urlEn" }` —
`number` הוא מספר החשבונית להצגה למשתמש, `url`/`urlHe` הוא לינק לצפייה בחשבונית.

**תגובת שגיאה (400):** `{ "errorCode", "errorMessage", "errorData" }` —
הצג את `errorMessage` למשתמש כמו שהוא. אל תניח ואל "תתקן" נתונים בשקט ותנסה שוב.

---

## 4. חשבונית מס — רב-שורתית — `POST /doc/addinvoicequickmultiline`

כשיש יותר ממוצר/שירות אחד באותה חשבונית. **גם כאן — כתוב את הגוף לקובץ
ושלח עם `--data-binary @file`, לא inline** (ראה הערת encoding בסעיף 2):

```bash
# כתוב לקובץ בסקראצ'פד, לדוגמה <SCRATCHPAD>/wb_invoice_multi.json, עם תוכן:
# {
#   "recipient_id_number": "<מספר עוסק/ת.ז., אם ידוע>",
#   "invoice_desc": "<הערה כללית, אופציונלי>",
#   "currency": "ILS",
#   "products": [
#     {"product_name": "<פריט 1>", "product_quantity": 1, "product_price_total": <סכום>, "vat_exempt": false},
#     {"product_name": "<פריט 2>", "product_quantity": 1, "product_price_total": <סכום>, "vat_exempt": false}
#   ],
#   "payments": [
#     {"pay_method": <קוד>, "sum_payed": <סכום>, "payment_desc": "<פרטים>"}
#   ]
# }

set -a; source .env; set +a
curl -sS --ssl-revoke-best-effort \
  -o /tmp/webenefit_invoice_multi.json -w "HTTP_STATUS:%{http_code}\n" \
  -X POST "https://wbnftapi.azurewebsites.net/weapi/v1/doc/addinvoicequickmultiline" \
  -H "Authorization: Bearer $WEBENEFIT_ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary "@<SCRATCHPAD>/wb_invoice_multi.json"
cat /tmp/webenefit_invoice_multi.json
```

`recipient_id_number` חובה אם **סכום כל השורות יחד** ≥ 5,000 ₪. אותם כללי תגובה
כמו בסעיף 3.

---

## 5. מסמך חשבונאי מלא — כל סוג מסמך — `POST /doc/add`

זהו ה-endpoint שתומך **בכל סוגי המסמכים** (חשבון עסקה, קבלה, זיכוי, ריכוז וכו') —
לא רק חשבונית מס. השתמש בו בכל פעם שהמשתמש מבקש מסמך שאינו "חשבונית מס"
רגילה (סעיפים 3-4), או כשצריך שליטה מלאה (למשל `client` object עם כתובת מלאה,
`vatType` פר-שורה, `payment[]` עם פרטי כרטיס/בנק).

**⚠️ כמו בסעיפים הקודמים — כתוב את גוף הבקשה לקובץ ושלח עם `--data-binary
@file`, לא inline** (בעיית encoding לעברית זהה).

```bash
# כתוב לקובץ בסקראצ'פד, לדוגמה <SCRATCHPAD>/wb_doc.json

set -a; source .env; set +a
curl -sS --ssl-revoke-best-effort \
  -o /tmp/webenefit_doc.json -w "HTTP_STATUS:%{http_code}\n" \
  -X POST "https://wbnftapi.azurewebsites.net/weapi/v1/doc/add" \
  -H "Authorization: Bearer $WEBENEFIT_ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary "@<SCRATCHPAD>/wb_doc.json"
cat /tmp/webenefit_doc.json
```

### שדות ברמת השורש

| שדה | חובה? | הערה |
|-----|-------|------|
| `type` | **כן** | קוד סוג המסמך — ראה טבלה למטה |
| `date` | **כן** | תאריך המסמך — Unix timestamp או ISO 8601 |
| `description` | לא | תיאור כללי (ברירת מחדל: "") |
| `remarks` | לא | הערה פנימית (ברירת מחדל: "") |
| `vatRateForced` | לא | דריסת שיעור מע"מ; `-1` = ברירת מחדל של המערכת |
| `dueDate` | לא | תאריך פירעון |
| `lang` | לא | שפת המסמך (ברירת מחדל `he`) |
| `currency` | לא | ברירת מחדל `ILS` |
| `client` | לא | ראה טבלת `client` למטה |
| `income` | לא | מערך שורות — ראה טבלת `income[]` למטה |
| `payment` | לא | מערך תשלומים — ראה טבלת `payment[]` למטה |

### `client` object

`id`, `name`, `email`, `taxId`, `address`, `city`, `zip`, `country`, `phone`,
`fax`, `mobile`, `add` (boolean) — כל השדות אופציונליים, אבל בפועל כדאי למלא
לפחות `name` ו-`taxId` (אם ידוע, ובוודאי אם הסכום ≥5,000 ₪ — אותו כלל כמו
ב-endpoints המהירים).

### `income[]` — שורת מוצר/שירות

| שדה | הערה |
|-----|------|
| `description` | תיאור הפריט (ברירת מחדל "") |
| `quantity` | כמות |
| `price` | מחיר יחידה |
| `currency` | ברירת מחדל `ILS` |
| `currencyRate` | שער המרה, אם המטבע שונה מ-ILS |
| `vatType` | enum: `Excluded` (לפני מע"מ) / `Included` (כולל מע"מ) / `Exempt` (פטור) / `ZeroVat` (מע"מ 0%) |
| `itemId`, `catalogNum`, `add` | אופציונליים, לרוב לא נדרשים לשימוש שוטף |

### `payment[]` — שורת תשלום

| שדה | הערה |
|-----|------|
| `date` | תאריך התשלום |
| `type` | קוד אמצעי תשלום — **אותה טבלה** כמו `pay_method` (למטה); זהו נתון ייחוס משותף ב-API |
| `price` | סכום |
| `currency` | ברירת מחדל `ILS` |
| `cardType` | enum: `None` / `Isracard` / `Visa` / `Diners` / `AmericanExpress` / `MaxCard` / `Mastercard` / `OtherCard` |
| `dealType` | enum: `Regular` / `Payments` (תשלומים) / `Credit` / `Debit` / `Other` |
| `numPayments` | מספר תשלומים (אם `dealType: Payments`) |
| `bankNumber`, `bankBranch`, `bankAccount`, `chequeNum` | לתשלום בהעברה/צ'ק |
| `cardNum` | **⚠️ רגיש — לעולם אל תדפיס/תרשום בלוג, ואל תבקש מהמשתמש מספר כרטיס מלא בצ'אט** |
| `accountId`, `transactionId` | מזהי אינטגרציה, אופציונלי |

### טבלת סוגי מסמכים (`type`)

| קוד | מסמך |
|-----|------|
| 10 | הצעת מחיר |
| 100 | הזמנה |
| 200 | תעודת משלוח |
| 210 | תעודת החזרה |
| 300 | **חשבון עסקה** |
| 305 | חשבונית מס |
| 310 | חשבונית ריכוז |
| 320 | חשבונית מס/קבלה |
| 330 | **חשבונית זיכוי** |
| 340 | חשבונית שיריון (pro forma) |
| 400 | **קבלה** |
| 405 | קבלה על תרומה |
| 500 | הזמנת רכש |
| 600 | קבלת פיקדון |
| 35000 | תדפיס חיוב אשראי |

### ⚠️ מגבלה ידועה — זיכוי (330) וקבלה על חשבונית (400/320)

**ה-API לא מתעד שדה פורמלי לקישור מסמך חדש למסמך מקורי** (למשל: חשבונית
זיכוי שמפנה לחשbonית המקורית שהיא מזכה, או קבלה שמפנה לחשבונית שהיא סוגרת).
עד שיתברר אחרת (או שתתקבל תשובה מ-WeBenefit support):

- בהוצאת **חשבונית זיכוי (330)** — נועה **חייבת** לשאול את המשתמש מהו מספר/
  תאריך המסמך המקורי, ולהכניס את ההפניה כטקסט חופשי וברור ב-`description`
  (למשל: "זיכוי לחשבונית מס' 1234 מתאריך 01/07/2026"). יש לציין למשתמש
  בטיוטה שזו הפניה טקסטואלית בלבד, לא קישור מובנה במערכת.
- בהוצאת **קבלה (400) על חשבונית קיימת** — אותו עיקרון: הפניה טקסטואלית
  ב-`description`, ולציין זאת למשתמש מפורשות בטיוטה.
- לפני שימוש בפועל בסוגי מסמכים אלה בהיקף משמעותי, מומלץ לאמת מול WeBenefit
  support (`info@webenefit.co.il`) שאין endpoint/שדה ייעודי שפוספס בתיעוד.

---

## 6. חיפוש מסמכים קיימים — `POST /doc/list`

לבדיקה אם מסמך כבר הופק (למניעת כפילות), או לאיתור מסמך מקורי לזיכוי/קבלה:

```bash
# גוף לדוגמה: {"clientId": "<id>", "type": 305, "dateStart": <unix>, "dateEnd": <unix>, "max": 20}
set -a; source .env; set +a
curl -sS --ssl-revoke-best-effort \
  -o /tmp/webenefit_doc_list.json -w "HTTP_STATUS:%{http_code}\n" \
  -X POST "https://wbnftapi.azurewebsites.net/weapi/v1/doc/list" \
  -H "Authorization: Bearer $WEBENEFIT_ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary "@<SCRATCHPAD>/wb_doc_list.json"
cat /tmp/webenefit_doc_list.json
```

פרמטרים שימושיים: `clientId`, `type`, `number`, `searchText`, `dateStart`/
`dateEnd` (Unix timestamp), `max`.

---

## 7. שליפת מסמך בודד — `GET /doc/find/{id}`

```bash
set -a; source .env; set +a
curl -sS --ssl-revoke-best-effort \
  -o /tmp/webenefit_doc_find.json -w "HTTP_STATUS:%{http_code}\n" \
  "https://wbnftapi.azurewebsites.net/weapi/v1/doc/find/<id>" \
  -H "Authorization: Bearer $WEBENEFIT_ACCESS_TOKEN"
cat /tmp/webenefit_doc_find.json
```

השתמש בזה כדי לוודא שמסמך שנשלח אכן נוצר, לפני שמנסים שוב אחרי שגיאה לא ברורה.

---

## טבלת קודי אמצעי תשלום (`pay_method` / `payment[].type`)

| קוד | אמצעי |
|-----|-------|
| 1 | מזומן |
| 2 | צ'ק |
| 3 | כרטיס אשראי |
| 4 | העברה בנקאית |
| 5 | PayPal |
| 6 | PayMe |
| 7 | PayBox |
| 8 | Apple Pay |
| 9 | Google Pay |
| 10 | Bit |
| 11 | אחר |
| 12 | אפליקציית תשלום |
| 13 | ניכוי מס במקור |

---

## אימות פלט

לאחר כל קריאה, בדוק את `HTTP_STATUS`:
- `200` → הצלחה. שלוף `number`/`url`/`urlHe` מהתגובה (גם ב-`doc/add` וגם
  ב-endpoints המהירים) ודווח.
- `400` → שגיאת נתונים. הצג את `errorMessage` למשתמש.
- `401` → טוקן לא תקף. הפנה לבדיקת טוקן (סעיף 1) ואם עדיין נכשל — לפנות ל-WeBenefit.
- `403` → לרוב ב-`doc/list` — הרשאה/פרמטרים שגויים.
- אחר → הצג את הקוד והתוכן הגולמי של הקובץ הזמני, אל תניח מה קרה.

**בכל מקרה של ספק אם מסמך נוצר בפועל** (timeout, תגובה לא ברורה) — **אל
תנסה לשלוח שוב אוטומטית**. השתמש ב-`doc/list`/`doc/find` (סעיפים 6-7) כדי
לבדוק אם המסמך כבר קיים, או שאל את המשתמש. הרצה כפולה יוצרת מסמך כפול אמיתי.
