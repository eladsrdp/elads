-- hachamama-parenting-program/server/migrations/0007_fix_mentors_recursion.sql
-- מתקן באג אמיתי מ-0005_participant_management.sql: מדיניות RLS על טבלת mentors
-- שבודקת "האם auth.uid() הוא מנחה" ע"י שאילתה חוזרת על *אותה* טבלת mentors —
-- גורם ל-"infinite recursion detected in policy for relation mentors" (Postgres 42P17)
-- בכל SELECT על mentors. כל המשתמשים המאומתים במערכת הזו הם מנחות (לנרשמים אין
-- חשבון Auth בכלל) — לכן די בבדיקת "מחובר?" בלי שאילתה רקורסיבית.

drop policy if exists mentors_select_all on mentors;

create policy mentors_select_all on mentors
  for select
  using (auth.uid() is not null);
