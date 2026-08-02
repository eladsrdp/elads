# תוכנית ליווי דיגיטלית — קורס הנחיית הורים (WhatsApp Companion)

## Overview
פרויקט עצמאי (לא קשור לצוות הסוכנים יעל/יובל/חן/נועה) — מערכת ליווי דיגיטלית לנרשמים לקורס הנחיית הורים, מחליפה Airtable קיים. כל נרשם מתקדם בקצב אישי (day1_date מחושב מתאריך הרשמה, תמיד יום ראשון), מקבל הודעות WhatsApp יומיות במספר משתנה לפי תוכן מוגדר מראש ("content_days"). השליחה עוברת דרך Make.com שמחובר ל-WhatsApp Business Platform הרשמי — האתגר המרכזי הוא ניהול חלון שירות 24 שעות שנפתח בלחיצת כפתור בוקר, כולל "קאצ'-אפ" של הודעות שהצטברו מימים שלא נפתחו. כולל גם שאלונים/טפסים (לינק בתוך הודעה) ודשבורד קריאה-בלבד למנחות מנטוריות. ארכיטקטורה בפועל: Hono (לא Next.js כמומלץ בהתחלה — הוחלף במימוש בפועל) + Supabase (Postgres). שלב נוכחי: Plan A מומש ומוזג ל-main (ראו session log).

כל קבצי הפרויקט (design doc, קוד) מאורגנים בתיקייה עצמאית בשורש הריפו: `hachamama-parenting-program/` — מבודד בכוונה משאר הפרויקטים בריפו (בקשת המשתמש: "לא רוצה שזה יהיה מעורבב עם דברים אחרים").

**Plan A (הליבה: DB + מנוע תזמון JIT + שילוב Make.com/WhatsApp) מומש, פרוס ב-Production על Vercel + Supabase אמיתיים, ושולח בפועל הודעות WhatsApp אמיתיות ל-11 מנויים אמיתיים** (`hachamama-parenting-program/server/`, Hono+TypeScript, `https://hahamama.vercel.app`). Plans B (ניהול תוכן), C (שאלונים), D (דשבורד מנחות) טרם התחילו — המשתמש עורך תוכן ישירות ב-Supabase Table Editor בינתיים.

## Open Questions
- **חגים / ימים שלא שולחים בהם:** המשתמש ציין בכוונה שיש להתייחס לחגים (להשהות שליחה, או לשלוח מרוכז אחרי כן) — לא הוחלט, לא מומש. נדרשת שיחת מעקב.
- **3 cron jobs ב-cron-job.org** (generate-daily/send-triggers פעם ביום, drip כל 5 דקות) — טרם הוגדרו; בלעדיהם המערכת רצה רק בהרצות ידניות.
- **Plan B (ניהול תוכן)** — עדיין לא נבנה; המשתמש עורך תוכן ישירות ב-Supabase Table Editor. שאל על שיתוף גישה לעוד אנשים — נענה עם Supabase org invite (גישה לכל הפרויקט, לא רק לתוכן) כפתרון זמני.
- **Plan C (שאלונים) ו-Plan D (דשבורד מנחות)** — לא התחילו.
- קובץ סיכום שבוע 1 (`סיכום_שבוע_ראשון_ויסות.pdf`) נשאר בלי הודעה לחבר אליו — אין הודעת 20:00 קיימת ליום 5 בתוכן שיובא. לא נפתר.

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

### 2026-08-01 — מימוש Plan A מלא (14 משימות), סקירה סופית, merge ל-main [shipped]
- **What was done:** מימוש כל 14 המשימות מ-`core-engine-plan.md` בעבודה עצמאית (worktree מבודד + `subagent-driven-development`): implementer subagent + spec-review subagent + code-quality-review subagent לכל משימה, לפי superpowers:subagent-driven-development. בסיום, סקירה סופית הוליסטית (opus) על כל 33 הקומיטים. אחרי תיקונים אחרונים: **58 טסטים עוברים, 1 smoke test מדולג כצפוי (ללא Supabase אמיתי), typecheck נקי לגמרי.** מוזג fast-forward ל-main ונדחף ל-origin (commit `2f2cf62`). ה-worktree נמחק.
- **Decisions:** (1) Hono + TypeScript, בהתאם למוסכמות `priority-lite/server`. (2) `AppDB` עם שתי מימושים (in-memory ל-dev/test, Supabase אמיתי) — נבחר factory pattern. (3) שלושת ה-jobs (generate-daily/send-triggers/drip) מבודדים שגיאות פר-item ומחזירים `errors[]` — לא כשל אחד עוצר ריצה שלמה. (4) RLS מופעל בלי policies על כל 6 הטבלאות (PII) — service role בלבד עוקף. (5) **PROGRAM_LENGTH_DAYS=448 (64 שבועות)**, env var, קבוע מפורש — לא נגזר מכמה content_days קיימים ב-DB (ראה בעיה קריטית למטה).
- **Bugs קריטיים שנמצאו ותוקנו ע"י code review, לפני שהגיעו ל-production:**
  1. **הכי חשוב:** `generate-daily` חישב "סוף התוכנית" לפי `getMaxContentDayNumber()` (כמה content_days קיימים כרגע), לא לפי אורך קבוע — בפריסה טרייה (לפני ש-Plan B מזין תוכן מלא) הריצה הראשונה הייתה מסמנת את כל הקבוצה הפעילה כ-`completed` בלי דרך חזרה. תוקן ע"י `PROGRAM_LENGTH_DAYS` מפורש (המשתמש אישר 448 יום = 64 שבועות).
  2. שני jobs (`generate-daily`, `send-triggers`) לא בודדו שגיאות פר-item — כשל בפריט אחד עוצר את כל הריצה. `drip` נבנה עם בידוד מההתחלה לאחר שהתבנית זוהתה.
  3. השוואת טלפון ב-`/make/button-click` הייתה string רגילה — Meta/WhatsApp שולח `wa_id` בלי `+`, מה שהיה דוחה כל לחיצת כפתור אמיתית ב-403. תוקן עם נרמול ספרות.
  4. 8 מתודות ב-`supabase-impl.ts` בלעו שגיאת Supabase בשקט (כולל `getMaxContentDayNumber` — הקשר ישיר לבאג #1). תוקן עם helper משותף שזורק.
  5. הרשמה כפולה (retry מהמערכת החיצונית) הייתה נכשלת/יוצרת כפילות — `findParticipantByPhone` היה dead code. תוקן ל-idempotent.
  6. חסר `.order()` בשתי שאילתות Supabase — הודעות היום עלולות להגיע מעורבבות (הוסתר ע"י local-impl ששומר סדר הוספה).
- **Notes / Caveats (מגבלות שנשארו פתוחות בכוונה, מתועדות ב-`server/README.md` "מגבלות ידועות"):** at-least-once delivery ב-drip (כפל הודעה אפשרי אם `markDeliverySent` נכשל אחרי שליחה מוצלחת); at-most-once עם סיכון אובדן ב-`/make/button-click` (סמנטיקה הפוכה, לא אוחדה); אין run-overlap guard ל-drip; אין generated types ל-Supabase; אין טסט אוטומטי למסלול השגיאה של Supabase (רק smoke test אמיתי, לא רץ כאן). **חגים/ימים-לא-שולחים — המשתמש ציין בכוונה שצריך התייחסות, לא מומש, "נדבר בהמשך".** טרם נפרס לשום hosting — המשתמש ביקש "קישור לבורסל" אבל הקוד כתוב כ-`@hono/node-server` (שרת Node רגיל), לא כ-Vercel serverless function; Railway/Render/Fly.io יתאימו בלי שינוי קוד.
- **Related:** [[project-overview]]

### 2026-08-02 — פריסה אמיתית ל-Vercel + שליחה אמיתית ראשונה ל-11 מנויים [shipped]
- **What was done:** המשתמש חיבר Supabase אמיתי (`lqhpfrhiiboshsoqnfdz.supabase.co`) והריץ את המיגרציה בעצמו. ייבאתי 11 מנויים אמיתיים (Airtable CSV) עם override ל-day1_date (כולם מתחילים ביום 15 ב-2026-08-02, לא מתאריך ההרשמה האמיתי — בקשה מפורשת). ייבאתי 102 הודעות/28 ימי תוכן מ-Airtable export אמיתי (parser נכתב מאפס לפורמט האמיתי — "מתי" הוא טקסט חופשי שמערבב יום+סוג+שעה בסדר לא אחיד; זוהתה וסוננה הודעה מותנית-שאלון שהייתה נבלעת בטעות ליום קבוע). פרסתי ל-Vercel (בקשת המשתמש: "בורסל, חינמי") ותיקנתי **5 בעיות ייצור נפרדות** שגילו רק בפריסה אמיתית (ראו למטה). לבסוף הרצתי בפועל `generate-daily`+`send-triggers` על ה-11 מנויים האמיתיים — **11/11 הודעות בוקר עם כפתור נשלחו בהצלחה ל-WhatsApp אמיתי דרך Make**, באישור מפורש של המשתמש לפני ההרצה.
- **Decisions:** (1) לא הרצתי שום job אמיתי לפני שהמשתמש אישר מפורשות (השהיתי בכוונה, כי זה יום 14 באותו רגע — יום שהמשתמש רצה לדלג עליו — וחיכיתי לחצות כדי ש-JIT יחשב יום 15 נכון). (2) ייבוא מדיה: קבצי Airtable attachment URLs (`v5.airtableusercontent.com`) התבררו כ**כבר פגי-תוקף (410)**, לא "יפוגו בקרוב" — המשתמש שלח את 2 תיקיות ה-ZIP המקוריות (יומי+שבועי), ו-19 קבצים הועלו ל-**Supabase Storage bucket ציבורי בשם `media`** (נוצר דרך קוד, לא dashboard) ועודכנו ב-DB ללינקים קבועים.
- **5 בעיות production שתוקנו ברצף (Vercel, לא נתפסו ב-CI/טסטים כי דורשות סביבת serverless אמיתית):**
  1. **Root Directory** ב-Vercel היה `hachamama-parenting-program` בלי `/server` — 404 על הכל. תוקן ע"י המשתמש ב-Settings.
  2. **`ERR_MODULE_NOT_FOUND`** — Vercel פרסה את קוד ה-TS המתורגם *בלי bundling*, ו-Node's native ESM loader (בשונה מ-tsx/vitest) דורש סיומת `.js` מפורשת בimports יחסיים. תוקן ב-12 קבצים (כל גרף ה-imports שנגיש מ-`api/index.ts`).
  3. **`FUNCTION_INVOCATION_TIMEOUT` (300s)** — ה-runtime החדש של Vercel Functions מתעלם ב-warning מ-default export שמחזיר `Response` (סגנון hono/vercel הישן) ומצפה ל-named export `fetch`. תוקן: `export default handle(app)` → `export const fetch = handle(app)`.
  4. **Deployment Protection** (Standard Protection) חסם גישה חיצונית — לא היה הגורם ל-timeout בפועל, אבל היה חוסם את cron-job.org/Make גם אחרי שהכל אחר יתוקן. כובה ע"י המשתמש.
  5. **שני env vars הודבקו לא נכון** (`CRON_SECRET` ואז `MAKE_WEBHOOK_SECRET`) — כל אחד גרם ל-401 עד שהמשתמש בדק/הדביק מחדש והריץ Redeploy. תבנית חוזרת: אחרי כל שינוי env var ב-Vercel **חובה Redeploy**, לא מספיק Save.
- **תיקוני אינטגרציה עם Make (מבוססי משוב אמיתי מה-scenario):** (1) שם יום-בשבוע צריך להכיל את המילה "יום" ("יום ראשון" לא "ראשון"), חוץ משבת שהיא "מוצ\"ש" בלי "יום" — תואם למינוח בתוכן עצמו. (2) הטלפון הנשלח ל-Make צריך להיות **בלי** `+` מוביל (פורמט wa_id) — האחסון הפנימי נשאר E.164 מלא, ההסרה קורית רק בשכבת השליחה ל-Make.
- **Notes / Caveats:** נשארו 3 קבצי "סיכום שבועי" (שבוע 1/3/4) בלי הודעה מתאימה לחבר אליהם ביום 5 (אין הודעת 20:00 בכלל בתוכן שיובא) — המשתמש בחר לחבר רק את ימים 19+26 (יש הודעת 20:00 קיימת עם `[קישור]` placeholder), ולא ליום 5. **חגים עדיין לא מטופלים** (open question קיים). דשבורד המנחות/Plan B/C עדיין לא נבנו — המשתמש מנהל תוכן ישירות ב-Supabase Table Editor בינתיים, ושואל על שיתוף גישה לעוד אנשים (Supabase org invite, לא Plan B). **הבא בתור: הגדרת 3 cron jobs ב-cron-job.org** (generate-daily/send-triggers פעם ביום, drip כל 5 דקות) כדי שהמערכת תרוץ אוטומטית בלי הרצות ידניות.
- **Related:** [[project-overview]]
