-- hachamama-parenting-program/server/migrations/0011_content_versions.sql
-- גרסאות תוכן: מאפשר כמה "סדרי תוכן" במקביל. כל הודעה שייכת לגרסה, וכל משתתפת משויכת לגרסה.
-- משפחות קיימות נשארות על "גרסה 1" (כל התוכן הקיים), וקוהורט חדש יכול לקבל גרסה משוכפלת וערוכה.
-- שינוי תוספתי בלבד: טבלה חדשה + עמודות חדשות. בלי מחיקות, בלי שינוי של PK/FK קיימים.
-- content_days (מספרי ימים + כותרות) נשארת משותפת לכל הגרסאות.
-- חשוב: להריץ *לפני* פריסת הקוד. קוד ישן שממשיך לרוץ אחרי המיגרציה לא נשבר — עמודות
-- הגרסה מקבלות ברירת מחדל (הגרסה הנוכחית-כברירת-מחדל), כך שגם הודעות/משתתפות שנוצרות בקוד הישן תקינות.

create table if not exists content_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- בדיוק גרסת-ברירת-מחדל אחת: משתתפת חדשה (גם דרך webhook ההרשמה) מקבלת אותה אוטומטית.
create unique index if not exists content_versions_one_default on content_versions (is_default) where is_default;

-- SECURITY: RLS כמו שאר טבלאות התוכן — מנחות (טבלת mentors) קוראות וכותבות; אף אחד אחר.
alter table content_versions enable row level security;

create policy content_versions_select_mentor on content_versions
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

create policy content_versions_insert_mentor on content_versions
  for insert to authenticated
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy content_versions_update_mentor on content_versions
  for update to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()))
  with check (exists (select 1 from mentors where user_id = auth.uid()));

insert into content_versions (name, is_default)
select 'גרסה 1', true
where not exists (select 1 from content_versions);

-- הגרסה שמוגדרת כרגע כברירת מחדל. security definer כדי שתעבוד גם בהקשר של service role / webhook.
create or replace function default_content_version_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from content_versions where is_default limit 1
$$;

alter table messages
  add column if not exists content_version_id uuid references content_versions(id) default default_content_version_id();
update messages set content_version_id = default_content_version_id() where content_version_id is null;
alter table messages alter column content_version_id set not null;

alter table participants
  add column if not exists content_version_id uuid references content_versions(id) default default_content_version_id();
update participants set content_version_id = default_content_version_id() where content_version_id is null;
alter table participants alter column content_version_id set not null;

create index if not exists messages_version_day_idx on messages (content_version_id, content_day_number);

-- שכפול גרסה: מעתיק את כל ההודעות של גרסת מקור לגרסה חדשה, בפעולה אחת (טרנזקציה אחת).
-- security invoker (ברירת מחדל) — פועל עם הרשאות המנחה, כלומר RLS של מנחות חל גם כאן.
-- הפונקציה מעתיקה רק שורות (media_url זהה בהתחלה). העתקת קבצי המדיה עצמם ב-Storage נעשית אחריה
-- בדשבורד (src/lib/content-clone.ts), כך שלכל גרסה יש קבצים משלה.
create or replace function clone_content_version(source_id uuid, new_name text) returns uuid
language plpgsql as $$
declare
  new_id uuid;
begin
  insert into content_versions (name) values (new_name) returning id into new_id;
  insert into messages (content_day_number, send_offset_time, order_in_day, body_text, media_url, media_type, content_version_id)
    select content_day_number, send_offset_time, order_in_day, body_text, media_url, media_type, new_id
    from messages
    where content_version_id = source_id;
  return new_id;
end;
$$;

-- הפיכת גרסה לברירת מחדל להרשמות חדשות. שני העדכונים באותה טרנזקציה (האינדקס היחיד דורש סדר).
create or replace function set_default_content_version(version_id uuid) returns void
language plpgsql as $$
begin
  update content_versions set is_default = false where is_default and id <> version_id;
  update content_versions set is_default = true where id = version_id;
end;
$$;
