-- hachamama-parenting-program/server/migrations/0008_goal_messages.sql
-- שולפים ע"י mentor-dashboard/ (לא server/) דרך /api/webhooks/goal-answer + /api/cron/send-goal-messages.
-- Make.com מעביר לכאן תשובת "יעד" מכל שגרת שאלון; אנחנו מתזמנים הודעת מעקב מותאמת-אישית
-- ושולחים אותה ב-14:00 בתאריך המתוכנן (ראו calculateGoalMessageSendDate ב-scheduling.ts).
create table goal_messages (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id),
  questionnaire_number int not null,
  goal_answer text not null,
  scheduled_date date not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_goal_messages_due on goal_messages (scheduled_date) where sent_at is null;

-- SECURITY: כמו video_submissions — RLS בלי policy כתיבה (רק service role, שעוקף RLS,
-- כותב/שולף כאן); מנחות מקבלות SELECT בלבד למקרה שירצו לראות תשובות-יעד בעתיד בדשבורד.
alter table goal_messages enable row level security;

create policy goal_messages_select_mentor on goal_messages
  for select to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));
