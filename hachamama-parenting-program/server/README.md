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
