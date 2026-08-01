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

תזמון בפועל (Vercel Cron / OS cron / כל scheduler אחר) הוא החלטת פריסה, לא חלק מהקוד הזה.

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
