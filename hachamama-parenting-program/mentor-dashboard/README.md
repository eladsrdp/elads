# Hachamama Mentor Dashboard (Plan D)

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

## פריסה ל-Vercel (חינמי, Hobby plan)

פרויקט Vercel **נפרד** מ-`server/` (אפליקציה עצמאית):

1. New Project → Import מ-GitHub → `eladsrdp/elads`.
2. **Root Directory:** `hachamama-parenting-program/mentor-dashboard`.
3. Framework Preset: Next.js (מזוהה אוטומטית).
4. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (אותם ערכים מ-`.env` המקומי — אלה מיועדים להיות ציבוריים, זה מה ש-`NEXT_PUBLIC_` מסמן).
5. Deploy.

## מגבלות ידועות (בכוונה, ראו design doc)

- אין שיבוץ מנחה↔נרשם — כל מנחה רואה את כל הנרשמים.
- אין יכולת שליחה/פעולה מהדשבורד — read-only בלבד על נרשמים/הודעות/היסטוריה
  (עדכון: מנחות קיבלו בהמשך גישת read-write על תוכן ההודעות — ראו סעיף "מסך תכנים" למטה).
- אין מסך תשובות לשאלונים — Plan C (שאלונים) לא נבנה עדיין, אין טבלת `forms`/`form_responses`.
  להוסיף כשיבנה.
- בלי component/E2E tests — רק unit tests ללוגיקה הטהורה (`src/lib/*.test.ts`). כיסוי
  התואם לעומק הבדיקות הקיים ב-`server/`.
