# תוכנית ליווי דיגיטלית — קורס הנחיית הורים (WhatsApp Companion)

## Overview
פרויקט עצמאי (לא קשור לצוות הסוכנים יעל/יובל/חן/נועה) — מערכת ליווי דיגיטלית לנרשמים לקורס הנחיית הורים, מחליפה Airtable קיים. כל נרשם מתקדם בקצב אישי (day1_date מחושב מתאריך הרשמה, תמיד יום ראשון), מקבל הודעות WhatsApp יומיות במספר משתנה לפי תוכן מוגדר מראש ("content_days"). השליחה עוברת דרך Make.com שמחובר ל-WhatsApp Business Platform הרשמי — האתגר המרכזי הוא ניהול חלון שירות 24 שעות שנפתח בלחיצת כפתור בוקר, כולל "קאצ'-אפ" של הודעות שהצטברו מימים שלא נפתחו. כולל גם שאלונים/טפסים (לינק בתוך הודעה) ודשבורד קריאה-בלבד למנחות מנטוריות. ארכיטקטורה מומלצת: Next.js + Supabase (Postgres+Auth). שלב נוכחי: spec אושר, טרם התחיל מימוש.

כל קבצי הפרויקט (design doc, ובעתיד הקוד) מאורגנים בתיקייה עצמאית בשורש הריפו: `hachamama-parenting-program/` — מבודד בכוונה משאר הפרויקטים בריפו (בקשת המשתמש: "לא רוצה שזה יהיה מעורבב עם דברים אחרים").

## Open Questions
- פרטי הזדהות/webhook URL מדויקים בין המערכת ל-Make.com — יוגדרו במימוש.
- ניסוח מדויק של WhatsApp Template להודעת הבוקר (טעון אישור Meta).

## Session Log

### 2026-07-31 — אפיון ראשוני + design doc [planned]
- **What was done:** ריאיון דרישות מלא (brainstorming skill) על 4 תת-מערכות: מנוע תוכן+תזמון, שילוב WhatsApp/Make, שאלונים, דשבורד מנחות. נכתב design doc מלא ואושר ע"י המשתמש. בהמשך אותו יום, לבקשת המשתמש, כל קבצי הפרויקט הועברו לתיקייה עצמאית בשורש הריפו — `hachamama-parenting-program/` (design doc כרגע ב-`hachamama-parenting-program/docs/2026-07-31-design.md`) — כדי לא להתערבב עם שאר הפרויקטים בריפו.
- **Decisions:** (1) Next.js+Supabase על פני DB/Auth עצמאי — תואם תשתית קיימת בסביבה. (2) Make.com כצינור בלעדי ל-WhatsApp — המערכת לא נוגעת ב-Cloud API ישירות. (3) יצירת message_deliveries **יומית (JIT)** ולא מראש בהרשמה — כדי שעריכת תוכן תחול אוטומטית על מי שעדיין לא הגיע לאותו יום. (4) הודעות שלא נשלחו מצטברות ומשתלחות בפעם הבאה שנפתח חלון, לא משנה כמה ימים עברו. (5) דשבורד מנחות read-only בלבד, בלי שיבוץ מנחה-נרשם (כולן רואות את כולם).
- **Notes / Caveats:** נמצאו שני scaffolds לא-מקושרים ל-git בשורש הריפו — `whatsapp-inbox/` (Next.js ריק) ו-`waha/` (docker-compose ל-WAHA, API לא-רשמי) — לא ברור אם הם שייכים לפרויקט הזה או ניסוי נפרד; לא נעשה בהם שימוש ב-design הזה. שים לב: `whatsapp-inbox/AGENTS.md` מכיל טקסט מוזר שמנחה לקרוא docs לפני כתיבת קוד — נראה כמו תוכן חשוד/לא-סטנדרטי, לא פעלתי לפיו.
- **Related:** [[project-overview]], none other (first entry on this topic)

### 2026-07-31 — תיקון מנגנון: שחרור תוכן per-day, לא הצטברות חוצת-ימים [planned]
- **What was done:** המשתמש תיקן הבנה שגויה קודמת (session 2026-07-31 הקודם): לחיצה על כפתור בוקר משחררת **רק** את ההודעות של אותו יום ספציפי, לא את כל ה-pending שהצטבר מימים אחרים שלא נלחצו. עודכן ה-design doc (`hachamama-parenting-program/docs/2026-07-31-design.md`): נוספה טבלת `daily_triggers` (id=UUID המשמש כ-button payload, per participant×calendar_date, עם clicked_at), ו-`message_deliveries` קיבלה FK אליה. `session_windows` הוגדר מפורשות כאילוץ טכני גלובלי (יכולת שליחה בלי תבנית) שלא קשור לאיזה יום תוכן משתחרר.
- **Decisions:** כל יום-תוכן הוא יחידת שחרור עצמאית עם payload ייחודי משלו על כפתור ה-WhatsApp; ימים שלא נלחצו נשארים pending לצמיתות עד שהכפתור הספציפי שלהם עצמו נלחץ (לא "מתמזגים" ליום מאוחר יותר).
- **Notes / Caveats:** מטריקת "מי לא פתח" בדשבורד המנחות עודכנה בהתאם — נגזרת מ-`daily_triggers.clicked_at` per-day, לא מ-session_windows.
- **Related:** [[project-overview]]

### 2026-07-31 — מיתוג "החממה" [planned]
- **What was done:** המשתמש אישר את מנגנון ה-per-day trigger (ללא שינוי נוסף), והעביר לוגו של "החממה" (שם + טאגליין "הדרך לגדול עם שרה גוטליב") לשימוש בעיצוב. נכתב `hachamama-parenting-program/brand/brand-guidelines.md` עם פלטת צבעים מוערכת (ירוק כהה, ירוק-אפור, חום-נחושת, רקע נייר בהיר).
- **Decisions:** מסמכי המיתוג נשמרים בתוך תיקיית הפרויקט המבודדת (`hachamama-parenting-program/brand/`), לא ב-vault/Brand Guidelines המשותף — כדי לשמור על הבידוד שהמשתמש ביקש.
- **Notes / Caveats:** קובץ הלוגו עצמו (PNG/SVG) עדיין לא נשמר בדיסק — עלה כתמונה בצ'אט בלי path נגיש. ה-HEX בפלטה הם הערכה חזותית בלבד, טעונים אישור/דיוק לפני שימוש בקוד.
- **Related:** [[project-overview]]

### 2026-07-31 — דיוק פלטת הצבעים מקובץ הלוגו [planned]
- **What was done:** המשתמש שמר את `logo.png` בפועל ב-`hachamama-parenting-program/brand/`. הרצתי ניתוח פיקסלים (PowerShell + System.Drawing) על הקובץ במקום הערכת-עין, ועודכן `brand-guidelines.md` עם HEX מדויקים: ירוק כהה `#2F5F47`, ירוק-אפור `#789084`, חום-נחושת `#8B481C`, רקע `#F3F3F3`.
- **Decisions:** אין.
- **Notes / Caveats:** הערכים נדגמו מ-PNG (לא מקור וקטורי) — אם יופיע קובץ Figma/SVG מקורי בעתיד, להעדיף את ה-HEX משם.
- **Related:** [[project-overview]]

### 2026-07-31 — תוכנית מימוש ל-Plan A (הליבה) [planned]
- **What was done:** ה-spec פוצל ל-4 תוכניות עצמאיות (A=ליבה: DB+תזמון+Make; B=ניהול תוכן; C=שאלונים; D=דשבורד מנחות). נכתבה תוכנית מימוש מפורטת ל-Plan A ב-`hachamama-parenting-program/docs/plans/2026-07-31-core-engine-plan.md` — 14 משימות TDD בסגנון bite-sized, Hono+Supabase+Vitest+Luxon, בהתאם למוסכמות הקוד הקיימות ב-`priority-lite/server` (factory pattern ל-DB, AppContext מוזרק, Bearer secrets ל-webhooks/cron).
- **Decisions:** אימוץ מלא של דפוסי `priority-lite/server`: `createDb()` factory (local in-memory / Supabase לפי env), `AppContext` מוזרק ל-routes, בדיקות עם Hono `app.request()`. הריצות היומיות (generate-daily/send-triggers/drip) נחשפות כ-HTTP endpoints מוגנים ב-CRON_SECRET (לא תהליך cron עצמאי) — מאפשר לכל scheduler חיצוני (Vercel Cron/OS cron) להפעיל אותן.
- **Notes / Caveats:** תוכנית המימוש עברה self-review ותוקן bug שהתגלה: בדיקת "הודעה עתידית לא משתחררת" ב-webhook הלחיצה השתמשה בתאריכים קבועים מ-2023 שהיו נופלים תמיד בעבר יחסית לשעון האמיתי (2026) — תוקן לתאריכים יחסיים ל-`Date.now()`.
- **Related:** [[project-overview]]

