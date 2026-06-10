# Cash Flow Pulse — אפליקציית תזרים אישי ועסקי

## Overview
אפליקציית Web מקומית (client-side בלבד) לניהול **תחזית תזרים** אישי ועסקי, שנבנתה בתיקייה `cashflow-pulse/` בתוך הריפו (אורתוגונלית למערכת צוות-הסוכנים — ראו [[project-overview]]). המוצר נשען על הזנה ידנית + ייבוא קובץ Excel/CSV (לא בנקאות פתוחה, שחסומה רגולטורית בישראל). הליבה: מנוע תחזית טהור שמחשב יתרה חזויה מהיום עד ה-10 בחודש פר כיס (עסקי/ביתי), ומקפיץ "התרעת דופק" כשהיתרה יורדת מתחת למסגרת האשראי. סטאק: React + TypeScript + Vite, Dexie (IndexedDB), Recharts, Tailwind v4 (RTL), Vitest. שלושה מסכים: דשבורד (מדד ה-10), ספר תנועות (actual/forecast + אישור), גשר העברות עסק↔בית, ומסך הגדרות. הסטטוס: גרסה ראשונה בנויה, נבדקת (22 בדיקות), ומאומתת בדפדפן end-to-end.

## Open Questions
- תנועות forecast שנוצרות מקבועים/העברות אינן ניתנות לאישור פרטני (הן הקרנות בלבד) — מימוש "materialize on confirm" נדחה כדי להימנע מספירה כפולה.
- `currentBalance` מתוחזק ידנית (בהגדרות / דרך אישור צפויים); תנועות actual מיובאות לא מעדכנות אותו אוטומטית.
- גודל bundle ~977KB (בעיקר xlsx) — code-splitting/lazy-load נדחה.
- אין עדיין אייקוני PWA אמיתיים (manifest קיים, מערך icons ריק).

## Session Log

### 2026-06-04 — בניית גרסה ראשונה של אפליקציית התזרים [shipped]
- **What was done:** ברainstorming מלא מול המשתמש (פלטפורמה, מקור נתונים, אחסון, סטאק, יום-יעד, סף-חריגה) → אפיון מאושר → בנייה. הוקם פרויקט Vite ב-`cashflow-pulse/`. נכתבו: מנוע תחזית טהור (`engine/forecast.ts`) עם `computeForecast`/`expandRecurring`/`expandTransfers`, עוזרי תאריך (`lib/date.ts`), שכבת DB (Dexie, `db/db.ts`+`operations.ts`), מנתח ייבוא Excel/CSV (`import/parseStatement.ts`), גיבוי JSON (`lib/backup.ts`), 3 מסכים + הגדרות, ורכיבי UI (PulseGauge, FlowChart, TransactionRow, ImportDialog ועוד). 22 בדיקות Vitest עוברות; `npm run build` נקי; אומת בדפדפן E2E (הוספת הוצאה צפויה → דשבורד הפך ל"סכנת חריגה" עם shortfall נכון).
- **Decisions:** (1) Web-App מקומי ולא מובייל נייטיב — מהיר לפיתוח סולו. (2) הזנה ידנית+ייבוא קובץ במקום בנקאות פתוחה — חסם רישוי/רגולציה בישראל, והמנוע אדיש למקור הנתונים. (3) IndexedDB מקומי ללא שרת — פרטיות מלאה, אפס עלות; גיבוי/שחזור JSON כרשת ביטחון. (4) `ensureSeeded` הומר ל-singleton-promise + bulkAdd רק לחסרים, לתיקון race ב-StrictMode (BulkError). (5) יום היעד קבוע על ה-10; סף חריגה (creditLimit) פר כיס.
- **Notes / Caveats:** האפליקציה מבודדת ב-`cashflow-pulse/` ולא נוגעת במערכת הסוכנים. ה-`shortfall` מחושב לפי הדיפ העמוק ביותר בחלון, לא רק יתרת היעד. ראו Open Questions למגבלות v1.
- **Related:** [[project-overview]]
