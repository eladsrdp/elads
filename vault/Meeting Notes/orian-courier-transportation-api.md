# Orian CourierExpert™ API — אינטגרציית שילוח

## Overview
מסמך API חיצוני (Orian CourierExpert™, גרסה 1.4) לאינטגרציה עם מערכת השילוח של Orian — יצירת הזמנות הובלה (Home Delivery), הדפסת תוויות, מעקב סטטוס חבילות, ואיתור נקודות PUDO (חנויות/לוקרים). המסמך והדוגמאות המקוריות נמצאים מחוץ לריפו, ב-OneDrive: `דוקומנטציות/API description.docx` + 2 קבצי XML לדוגמה (One Package / MultiPackage to One Order). **סטטוס: שלב תיעוד/הכנת בדיקות בלבד — אין עדיין קוד אינטגרציה בפרויקט.**

**Base URLs:** Test = `https://disapiTest.orian.com`, Production = `https://disapi.orian.com`.

**Endpoints:** `Login` (POST, Basic Auth → AuthToken בתוקף לשעה), `Logout` (POST), `CreateTransportationOrder` (POST, גוף XML לפי סכימת TRANSPORTATIONORDER, Content-Type מוצהר כ-`x-www-form-urlencoded` למרות גוף XML גולמי — לא אומת חי), `GetTransporttaionOrderLabel` (POST, XML עם CONSIGNEE+ORDERID → תווית PDF ב-Base64), `GetPackageStatus` (GET, query params), `pudo/Getpudos` ו-`pudo/Getpudosjson` (GET, איתור PUDO לפי עיר/כתובת/מרחק).

CONSIGNEE (מספר לקוח קבוע אצל Orian) בדוגמאות: `30000060`.

## Open Questions
- עדיין לא אומת: `CreateTransportationOrder` עם `Content-Type: x-www-form-urlencoded` וגוף XML גולמי — Login כן אומת חי (ראו Session Log), שאר הקריאות טרם נבדקו.
- אין עדיין credentials (username/password) שמורים ב-.env — כשתתחיל אינטגרציה בקוד, יש להוסיף `ORIAN_USERNAME`/`ORIAN_PASSWORD` ל-.env (לא לצ'אט/git), ראו [[env-config]].
- לא ידוע אם זו אינטגרציה עצמאית חדשה או קשורה לפרויקט קיים (למשל priority-lite) — לברר עם המשתמש כשיתחיל פיתוח בפועל.

## Session Log

### 2026-09-08 — קריאת מסמך API + הכנת curl לבדיקות [planned]
- **What was done:** נקרא מסמך `API description.docx` (הומר מ-docx ל-XML גולמי, פורק ידנית כי pandoc לא הותקן בסביבה) + שני קבצי XML לדוגמה. הוכנו 8 פקודות curl (Login/Logout/CreateTransportationOrder ×2/GetTransporttaionOrderLabel/GetPackageStatus/GetPudos xml+json) עם משתני סביבה במקום credentials גלויים.
- **Decisions:** credentials (`ORIAN_USER`/`ORIAN_PASS`) מועברים כמשתני סביבת shell שהמשתמש מגדיר בעצמו בטרמינל — לא הוטמעו בשום קובץ/צ'אט, לפי מדיניות אבטחת הארגון. פרטי איש הקשר (שם/טלפון/מייל) בקבצי הדוגמה לא שוכפלו כאן או בתשובה לצ'אט מעבר לנדרש — PII שנשאר רק בקבצים המקוריים ב-OneDrive (מחוץ לריפו).
- **Notes / Caveats:** pandoc לא זמין בסביבת ה-Bash הנוכחית (רק unzip+node לפירוק XML ידני). קבצי המקור נמצאים ב-OneDrive, לא הועתקו לריפו.
- **Related:** [[env-config]], none נוספים (רשומה ראשונה בנושא)

### 2026-09-08 — Login אומת חי — פורמט תגובה שונה מהמסמך [debug]
- **What was done:** המשתמש הריץ את קריאת `Login` (test env) בפועל וקיבל 200. **פורמט התגובה שונה מהמסמך**: המסמך תיאר גוף JSON ‏`{AuthToken: ...}`, אך בפועל הגוף הוא המחרוזת `"Authorized"` בלבד, וה-AuthToken חוזר ב-**response header** בשם `authtoken` (וגם `tokenexpiry` header, שחזר ריק בבדיקה זו).
- **Decisions:** יש לקרוא את הטוקן מה-header `authtoken` (case-insensitive) ולא מגוף התגובה, בכל מימוש עתידי של הקריאה הזו.
- **Notes / Caveats:** הטוקן שהתקבל בבדיקה זו לא נשמר בשום קובץ — חי ל-1 שעה לפי המסמך, נמסר למשתמש דרך הצ'אט בלבד להמשך בדיקות ידניות.
- **Related:** none חדשים
