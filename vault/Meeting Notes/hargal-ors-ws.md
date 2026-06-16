# Hargal ORS WS — ממשק מערכת שכר הרגל

## Overview
ממשק SOAP ל-WS שפיתחה הרגל עבור קליטה/עדכון/שליפת עובדים ממערכות חיצוניות (Priority ERP ועוד).
WS ממוקם ב-`https://hargal.ors.co.il/WS_ORS/HG_WEBSERVICE.SVC` (WCF, IIS).
מפעלים רלוונטיים: 12, 14, 17, 18, 23, 25.
הפרויקט חי ב-`hargal-ws/` — SOAP client טהור ב-Node.js (ללא תלויות חיצוניות), credentials ב-`.env`.
Operations: `Get_Updates`, `Get_Worker_State`, `Send_New_Workers`, `Update_Workers`, `IsOnline`.

## Open Questions
- האם ה-WS נגיש דרך VPN בלבד? (בבדיקה מהמחשב — ENOTFOUND, הדומיין לא מנותב)
- מה ה-SOAPAction הנכון לכל operation? (נוכחי: tempuri.org — לאמת מול WSDL כשנגיש)
- מה שם ה-XML tag לרשומת עובד בתגובה? (נוכחי: Worker_Data — לאמת מול תגובה אמיתית)
- `KodMifal` בדוגמה הוא 1, אך המפעלים הרלוונטיים הם 12/14/17/18/23/25 — לאמת

## Session Log

### 2026-06-16 — בניית SOAP client ראשוני [wip]
- **What was done:** אפיון המערכת מתוך 2 קבצים (דוגמת פניה.txt + אפיון.docx). נבנה `hargal-ws/client.js` (SOAP client טהור, ללא תלויות), `test-call.js` (מריץ IsOnline + Get_Updates על כל 6 מפעלים), `load-env.js` (קורא .env ללא dotenv), `.env.example`. Credentials ב-`hargal-ws/.env` (מוחרג מ-git). הדומיין לא מנותב ממחשב הפיתוח — כנראה VPN נדרש.
- **Decisions:** ללא npm dependencies — Node.js http/https מובנה בלבד (אין package.json נפרד). credentials מ-env vars בלבד (// SECURITY). parser XML בסיסי ב-regex (אין xmldom) — מספיק לשדות flat; אם תגובה מורכבת — לשדרג.
- **Notes / Caveats:** צריך VPN פעיל להרצת test-call.js. לאחר קריאה אמיתית — לאמת שמות ה-XML tags ב-parseEmployees ולתקן במידת הצורך. SOAPAction ייתכן שונה מ-tempuri.org/IHG_WEBSERVICE/OperationName.
- **Related:** [[priority-lite-app]], [[env-config]]
