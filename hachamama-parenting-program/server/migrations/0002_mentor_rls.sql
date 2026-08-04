-- hachamama-parenting-program/server/migrations/0002_mentor_rls.sql
-- מוסיף גישת קריאה-בלבד למנחות (Plan D — דשבורד מנחות), ראו design doc § "דשבורד מנחות".
-- מנחה = משתמש ב-Supabase Auth (auth.users) שיש לו שורה בטבלת mentors. הדשבורד עצמו
-- (mentor-dashboard/) מתחבר ל-Supabase עם anon key בלבד — ה-RLS כאן הוא קו ההגנה היחיד.

create table mentors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table mentors enable row level security;

-- מנחה יכול לקרוא רק את השורה של עצמו — נדרש כדי שהאפליקציה תוכל לבדוק "האם אני מנחה"
-- מצד הלקוח בלי service role.
create policy mentors_select_self on mentors
  for select using (auth.uid() = user_id);

-- SECURITY: כל policy כאן היא SELECT בלבד — אין ל-mentors שום יכולת כתיבה על שום טבלה.
-- בלי ה-exists הזה, RLS המופעל בלי policies (ראו 0001_init.sql) חוסם את כל
-- ה-authenticated role, מה שבלעדיו היה חוסם גם את המנחות בטעות.
create policy participants_select_mentor on participants
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

create policy content_days_select_mentor on content_days
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

create policy messages_select_mentor on messages
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

create policy daily_triggers_select_mentor on daily_triggers
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

create policy message_deliveries_select_mentor on message_deliveries
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

-- session_windows בכוונה לא נגישה למנחות — לא חלק מה-scope שבמסמך העיצוב.
