# Hachamama Server — Core Engine (Plan A)

השרת שמריץ את מנוע התזמון (day1_date, ריצה יומית JIT) ואת השילוב עם Make.com/WhatsApp.
ראו `hachamama-parenting-program/docs/2026-07-31-design.md` לתיאור המלא.

## הרצה בפיתוח

```bash
npm install
npm run dev
```

בלי `.env` — משתמש ב-in-memory DB (נמחק בכל restart) ובלי Make אמיתי מוגדר.
ל-webhooks יש secrets ברירת מחדל לפיתוח (`dev-secret-change-me`) — לעולם לא בפרודקשן.

## בדיקות

```bash
npm test
```

## פריסה ל-Vercel (חינמי, Hobby plan)

יש שני entrypoints — `src/index.ts` (שרת Node רגיל, ל-Railway/Render/פיתוח מקומי)
ו-`api/index.ts` (serverless function, ל-Vercel). שניהם עוטפים את אותו `createApp` —
אין כפילות לוגיקה, רק דרך ההרצה שונה.

1. ב-[vercel.com](https://vercel.com) → New Project → Import מ-GitHub → הריפו `eladsrdp/elads`.
2. **Root Directory:** `hachamama-parenting-program/server` (חשוב — הריפו מכיל עוד פרויקטים).
3. Framework Preset: Other (Vercel יזהה את `api/` אוטומטית).
4. Environment Variables (Project Settings): לכל הפחות `SIGNUP_WEBHOOK_SECRET`,
   `MAKE_WEBHOOK_SECRET`, `CRON_SECRET` (ערכים אקראיים), `NODE_ENV=production`.
   בלי `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` השרת ירוץ על in-memory DB —
   **על serverless זה שקול ל"בלי DB בכלל"**: כל invocation יכול לקבל instance חדש,
   כך שנתונים לא נשמרים בין בקשות בכלל (בשונה מ-Railway/Render, שם תהליך אחד
   נשאר חי). לכן ל-Vercel חובה Supabase אמיתי כדי שהמערכת תעשה משהו שימושי.
5. Deploy — Vercel ייתן URL ציבורי.

**תזמון: משולב — Vercel Cron המובנה + שירות חיצוני אחד.**

`vercel.json` מגדיר את `generate-daily` (21:05 UTC = 00:05 שעון ישראל בקיץ) ו-
`send-triggers` (03:45 UTC = 06:45 שעון ישראל בקיץ) כ-**Vercel Cron מובנה** —
זמין וחינמי גם ב-Hobby plan. Vercel Cron תמיד קורא ב-**GET** (לא POST) ומצרף
אוטומטית `Authorization: Bearer $CRON_SECRET` מה-env var של הפרויקט עצמו —
שני ה-routes תומכים ב-GET+POST בדיוק בשביל זה, בלי צורך בשום הגדרה נוספת מעבר
להגדרת `CRON_SECRET` כ-env var.

**⚠️ מגבלה: Vercel Cron הוא UTC קבוע, בלי טיימזון ובלי DST אוטומטי.** כשהשעון
בישראל עובר (מרץ/אוקטובר) צריך לעדכן ידנית את שני ה-schedule ב-`vercel.json`
ולפרוס מחדש (±1 שעה).

**⚠️ מגבלה נוספת: Vercel Cron ב-Hobby plan לא מתחייב לדקה המדויקת** — נצפה
בפועל ~10 דקות איחור (הרצה שהוגדרה ל-06:30 הגיעה בפועל ל-06:40). לא נגרם נזק —
`send-triggers` בכל זאת שולח, רק מעט אחרי השעה שרשומה כאן. אם דיוק מדויק
בשעה יהיה חשוב בעתיד, החלופה היא להעביר את ה-endpoint הזה ל-cron-job.org (כמו
`drip` למטה) — לא נעשה כרגע.

**⚠️ `drip` (כל 5 דקות) חורג ממגבלת "פעם ביום" של Vercel Cron בחינמי** — לכן
*רק* עבורו צריך שירות חיצוני: [cron-job.org](https://cron-job.org) (חינמי, תזמון
חופשי, תומך גם ב-Timezone כדי להימנע מבעיית ה-UTC/DST) קורא ל-`/api/cron/drip`
עם `Authorization: Bearer $CRON_SECRET` כל 5 דקות.

## חיבור ל-Supabase אמיתי

1. ליצור פרויקט Supabase חדש.
2. להריץ את `migrations/0001_init.sql` (SQL editor או `supabase db push`).
3. להגדיר ב-`.env`: `SUPABASE_URL` ו-`SUPABASE_SERVICE_KEY` (מתוך Project Settings → API).
4. `npm test` ירוץ עכשיו גם על ה-smoke test מול Supabase אמיתי, לא רק in-memory.

## חיבור ל-Make.com אמיתי

הריפו הזה **לא** יוצר את תשריט ה-Make — זו הגדרה חד-פעמית שנעשית ב-UI של Make:

1. ליצור scenario ב-Make עם **Custom Webhook** trigger — ה-URL שהוא ייתן הוא `MAKE_WEBHOOK_URL`.
2. באותו scenario: לפי `payload.kind` (`morning_trigger` / `session_message`) לשלוח ב-WhatsApp
   Business Platform — תבנית מאושרת עם כפתור (`morning_trigger`, כולל `buttonPayload`) או
   הודעת session חופשית (`session_message`).
3. Scenario **שני**, בכיוון ההפוך: WhatsApp trigger בלחיצת כפתור → קריאת HTTP ל-
   `POST /api/webhooks/make/button-click` עם `{ phone, buttonPayload }` (ה-`Authorization` header
   עם `MAKE_WEBHOOK_SECRET` מוגדר בתוך ה-scenario ב-Make, לא כאן).

בלי `MAKE_WEBHOOK_URL` מוגדר, שליחות דרך `send-triggers`/`drip` ייכשלו עם שגיאה ברורה
(`MAKE_WEBHOOK_URL לא מוגדר`) שנתפסת ב-`errors[]` של אותה ריצה — לא תיפול השרת, אבל
גם לא תישלח שום הודעה בפועל עד שה-scenario מוגדר.

## Endpoints

| Method | Path | הגנה | תפקיד |
|---|---|---|---|
| GET | `/api/health` | — | health check |
| POST | `/api/webhooks/signup` | `Authorization: Bearer $SIGNUP_WEBHOOK_SECRET` | יוצר נרשם חדש, מחשב day1_date |
| POST | `/api/webhooks/make/button-click` | `Authorization: Bearer $MAKE_WEBHOOK_SECRET` | Make מעביר לחיצת כפתור; מחזיר הודעות לשליחה מיידית |
| POST | `/api/cron/generate-daily` | `Authorization: Bearer $CRON_SECRET` | ריצה יומית — ליצור בסביבת production ב-00:05 שעון ישראל |
| POST | `/api/cron/send-triggers` | `Authorization: Bearer $CRON_SECRET` | שליחת הודעות טריגר בוקר — לתזמן קצת אחרי generate-daily |
| POST | `/api/cron/drip` | `Authorization: Bearer $CRON_SECRET` | שליחה בזמן אמת — לתזמן כל 5 דקות |

## אמינות (הרחבות שנוספו ב-code review)

- שלושת ה-jobs (`generate-daily`, `send-triggers`, `drip`) מבודדים שגיאות פר-item —
  כשל בפריט אחד (נרשם/trigger/delivery) לא עוצר את שאר הריצה, ומוחזר ב-`errors[]`
  בתשובת ה-JSON.
- הטבלאות ב-Supabase מוגנות ב-RLS בלי policies — נגישות רק ל-service role
  (היחיד שהשרת מתחבר איתו). ראו `migrations/0001_init.sql`.

תזמון בפועל (scheduler חיצוני / OS cron) הוא החלטת פריסה, לא חלק מהקוד הזה —
ראו "פריסה ל-Vercel" למעלה לגבי המגבלה על Vercel Cron המובנה.

## מגבלות ידועות (מהסקירה הסופית)

נמצאו וטופלו במהלך המימוש (ראו commit history), אבל כמה נשארו פתוחות בכוונה —
כתובות כאן כדי שלא יישארו קבורות ב-commit messages בלבד:

- **at-least-once delivery ב-`drip.ts`.** אם `sendSessionMessage` מצליח בפועל אבל
  `markDeliverySent` אחריו נכשל, ה-delivery נשאר pending ונשלח שוב בריצה הבאה —
  הנרשם עלול לקבל את אותה הודעה פעמיים. תיקון אמיתי (סטטוס ביניים `'sending'` +
  מדיניות timeout, או מפתח אידמפוטנטיות ל-Make) דורש שינוי סכימה — לא חלק מהתוכנית הזו.
- **at-most-once (עם סיכון אובדן) ב-`/make/button-click`.** כאן `markDeliverySent`
  נקרא לפני שידוע אם Make בפועל שלח — הסמנטיקה ההפוכה מ-`drip.ts`, לא אוחדה בכוונה.
- **אין run-overlap guard ל-drip.** רץ כל כמה דקות; אם ריצה אחת נמשכת יותר מהמרווח
  (backlog גדול, כל שליחה עד 10 שניות timeout), שתי ריצות עלולות לחפוף על אותן שורות.
- **אין generated types ל-Supabase.** `supabase-impl.ts` עושה cast (`as T`) לתוצאות
  שאילתה, ולא טיפוסים שנוצרו מהסכימה בפועל — דריפט בין הסכימה ל-interface יתגלה רק בזמן ריצה.
- **חגים/ימים שלא שולחים בהם — עדיין לא מטופל.** `generate-daily`/`send-triggers`/`drip`
  רצים בכל יום קלנדרי בלי שום מודעות לחגים. יש להחליט (טרם הוחלט) אם ביום חג
  משהים את השליחה לגמרי (ומה קורה ל-`day1_date`/למספור הימים בהמשך) או שולחים
  מרוכז אחרי כן — לא לממש עד שההחלטה מתקבלת.
- **מסלול השגיאה של Supabase לא נבדק אוטומטית.** התיקון הקריטי ב-`maybeSingleOrThrow`
  (Task 13) אומת בקריאת קוד, לא ב-test עם client מדומה שמדמה תשובת שגיאה אמיתית.
- **CRON_SECRET משותף** לשלושת ה-endpoints, גם ש-send-triggers/drip גורמים לשליחה
  אמיתית ב-WhatsApp ו-generate-daily רק כותב ל-DB — התקבל בכוונה, ראו `cron.ts`.
