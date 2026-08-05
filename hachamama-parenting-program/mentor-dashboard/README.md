# Hachamama Mentor Dashboard (Plan D)

## ⚠️ זו האפליקציה המאוחדת (2026-08-05)

`hachamama-parenting-program/server/` (הישן) ו-`mentor-dashboard/` (הזו) מוזגו לאפליקציה
אחת — הכל (webhooks, cron jobs, לינק הסרטון הציבורי, דשבורד המנחות) רץ כאן, ב-Vercel
project אחד. `server/` נשאר בריפו בלי להימחק (בכוונה, לצורך השוואה/rollback), אבל
**אחרי שהמעבר יאושר בפועל הוא לא צריך להיפרס יותר**. ראו
`docs/plans/2026-08-05-unify-into-single-app-plan.md` לתוכנית המלאה ולצ'קליסט המעבר
(עדכון URLs ב-Make.com וב-cron-job.org).

## Endpoints (מאוחד)

| Method | Path | הגנה | תפקיד |
|---|---|---|---|
| POST | `/api/webhooks/signup` | `Authorization: Bearer $SIGNUP_WEBHOOK_SECRET` | יוצר נרשם חדש |
| POST | `/api/webhooks/make/button-click` | `Authorization: Bearer $MAKE_WEBHOOK_SECRET` | Make מעביר לחיצת כפתור |
| GET/POST | `/api/cron/generate-daily` | `Authorization: Bearer $CRON_SECRET` | ריצה יומית — Vercel Cron מובנה, 00:05 |
| GET/POST | `/api/cron/send-triggers` | `Authorization: Bearer $CRON_SECRET` | טריגר בוקר — cron-job.org, 06:45 מדויק |
| GET/POST | `/api/cron/drip` | `Authorization: Bearer $CRON_SECRET` | שליחה בזמן אמת — cron-job.org, כל 5 דקות |
| GET/POST | `/video-submit` | — (ציבורי) | לינק להעלאת סרטון ע"י נרשם |
| — | `/participants`, `/content` | Supabase Auth (מנחה) | הדשבורד |

## Env vars נוספים (חדש — לא היו כאן קודם, הגיעו מ-server/)

בנוסף ל-`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` הקיימים, האפליקציה
המאוחדת צריכה גם (כולם **בלי** `NEXT_PUBLIC_` — סודות server-only):

- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — אותו פרויקט Supabase, מפתח service role.
- `MAKE_WEBHOOK_URL` — ה-webhook URL של Make.com (לא משתנה, זה ה-URL של Make עצמו).
- `SIGNUP_WEBHOOK_SECRET`, `MAKE_WEBHOOK_SECRET`, `CRON_SECRET` — אפשר להשתמש באותם
  ערכים שהיו מוגדרים ב-Vercel project הישן (`server/`), כדי לא לצטרך לעדכן secrets
  בצד Make/cron-job.org — רק את ה-URL (host) צריך לעדכן שם, לא את הטוקנים.
- `PROGRAM_LENGTH_DAYS` — `448` (64 שבועות), כמו קודם.

---

דשבורד קריאה-בלבד למנחות. מתחבר ישירות ל-Supabase (לא דרך `server/`), עם auth
של Supabase (email+password) ו-RLS שמגביל גישה לקריאה בלבד (ראו
`server/migrations/0002_mentor_rls.sql`). ראו `hachamama-parenting-program/docs/2026-07-31-design.md`
§ "דשבורד מנחות" למפרט המקורי.

## הרצה בפיתוח

```bash
npm install
cp .env.example .env   # למלא NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

שני הערכים נמצאים ב-Supabase Project Settings → API — **ה-anon key, לא ה-service role key**
(ה-service role עוקף RLS ולעולם לא צריך להגיע לדפדפן).

## בדיקות

```bash
npm test
```

## יצירת מנחה חדשה

אין ממשק הרשמה עצמית בכוונה (מתאים למספר קטן של מנחות מוכרות). לכל מנחה חדשה:

1. Supabase Dashboard → Authentication → Users → **Add user** (או Invite, שישלח אימייל
   לבחירת סיסמה). לרשום את ה-UUID שנוצר.
2. ב-SQL editor של אותו פרויקט:

```sql
insert into mentors (user_id, full_name) values ('<uuid מהשלב הקודם>', '<שם המנחה>');
```

בלי השורה הזו ב-`mentors`, המשתמשת יכולה להתחבר (Auth מצליח) אבל תראה טבלה ריקה —
ה-RLS policies (migration 0002) דורשות שורה תואמת ב-`mentors`.

## מסך תכנים (`/content`)

אותה כניסת מנחה משמשת גם לעריכת תכנים — לא רק לצפייה בנרשמים. גריד רציף של כל 448 הימים,
עריכת טקסט inline, פאנל צד להעלאת מדיה (drag-and-drop, נשמר ל-Supabase Storage bucket `media`).
דורש migration `0003_mentor_content_write.sql` (RLS write על content_days/messages + bucket policies).

## ניהול נרשמים (`/participants`)

מסך הנרשמים כולל גם הוספה/עריכה/מחיקה, לא רק צפייה — כולל הצמדת "מנחה אחראית"
(תגית ארגונית בלבד, לא מגבילה מי רואה מה — כל מנחה עדיין רואה את כל הנרשמים).
מחיקה חסומה אם לנרשם כבר יש היסטוריית הודעות/סרטונים — יש להשהות (`paused`) במקום.
דורש migration `0005_participant_management.sql`.

## פריסה ל-Vercel (חינמי, Hobby plan)

זהו כעת פרויקט Vercel **היחיד** של המערכת (ראו "זו האפליקציה המאוחדת" למעלה):

1. New Project → Import מ-GitHub → `eladsrdp/elads`.
2. **Root Directory:** `hachamama-parenting-program/mentor-dashboard`.
3. Framework Preset: Next.js (מזוהה אוטומטית).
4. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (אותם ערכים מ-`.env` המקומי — אלה מיועדים להיות ציבוריים, זה מה ש-`NEXT_PUBLIC_` מסמן)
   **וגם** את כל משתני הסביבה ברשימת "Env vars נוספים" למעלה.
5. Deploy.
6. לפני שמעדכנים את Make.com/cron-job.org לכתוב ל-URL החדש — לאמת ידנית שכל
   ה-endpoints שברשימה למעלה עובדים על הפריסה החדשה. ראו את צ'קליסט המעבר
   ב-`docs/plans/2026-08-05-unify-into-single-app-plan.md` (Task 9) לפני כל שינוי
   בהגדרות Make.com/cron-job.org — המערכת הקיימת שולחת הודעות אמיתיות ל-14 נרשמים.

## מגבלות ידועות (בכוונה, ראו design doc)

- אין שיבוץ מנחה↔נרשם — כל מנחה רואה את כל הנרשמים.
- אין יכולת שליחה/פעולה מהדשבורד — read-only בלבד על נרשמים/הודעות/היסטוריה
  (עדכון: מנחות קיבלו בהמשך גישת read-write על תוכן ההודעות — ראו סעיף "מסך תכנים" למטה).
- אין מסך תשובות לשאלונים — Plan C (שאלונים) לא נבנה עדיין, אין טבלת `forms`/`form_responses`.
  להוסיף כשיבנה.
- בלי component/E2E tests — רק unit tests ללוגיקה הטהורה (`src/lib/*.test.ts`). כיסוי
  התואם לעומק הבדיקות הקיים ב-`server/`.
