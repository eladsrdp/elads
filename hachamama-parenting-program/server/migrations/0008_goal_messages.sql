-- hachamama-parenting-program/server/migrations/0008_goal_messages.sql
-- שולפים ע"י mentor-dashboard/ (לא server/) דרך /api/webhooks/goal-answer + drip.ts.
-- Make.com מעביר לכאן תשובת "יעד" מכל שגרת שאלון; אנחנו מתזמנים הודעת מעקב מותאמת-אישית
-- ל-14:00 בתאריך המחושב (ראו calculateGoalMessageSendDate ב-scheduling.ts), אבל בפועל
-- נשלחת ע"י drip.ts (לא cron נפרד) — רק ברגע שיש חלון-session פתוח למשתתף, בדיוק כמו
-- שאר ההודעות היומיות. אם מישהו טרם לחץ על כפתור הבוקר ב-14:00, ההודעה ממתינה ונשלחת
-- ברצף עם שאר הודעות אותו יום ברגע שהוא לוחץ.
create table goal_messages (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id),
  questionnaire_number int not null,
  goal_answer text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_goal_messages_due on goal_messages (scheduled_for) where sent_at is null;

-- SECURITY: כמו video_submissions — RLS בלי policy כתיבה (רק service role, שעוקף RLS,
-- כותב/שולף כאן); מנחות מקבלות SELECT בלבד למקרה שירצו לראות תשובות-יעד בעתיד בדשבורד.
alter table goal_messages enable row level security;

create policy goal_messages_select_mentor on goal_messages
  for select to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));
