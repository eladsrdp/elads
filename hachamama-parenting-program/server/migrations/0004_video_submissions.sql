-- hachamama-parenting-program/server/migrations/0004_video_submissions.sql
-- טבלת סרטונים שנרשמים מעלים בעצמם דרך לינק ציבורי רב-פעמי (POST /video-submit,
-- מוגש ע"י server/ עם service role — לא ע"י mentor-dashboard/, ראו הערת ארכיטקטורה
-- בתוכנית). RLS מופעל בלי policy כתיבה בכוונה — רק ה-server (service role, עוקף RLS)
-- כותב כאן; מנחות מקבלות SELECT בלבד, תואם ל-Plan D.
create table video_submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id),
  video_url text not null,
  submitted_at timestamptz not null default now()
);

alter table video_submissions enable row level security;

create policy video_submissions_select_mentor on video_submissions
  for select to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));
