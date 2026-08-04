-- hachamama-parenting-program/server/migrations/0003_mentor_content_write.sql
-- מוסיף למנחות (טבלת mentors, ראו 0002_mentor_rls.sql) גישת read-write על content_days/messages
-- ועל bucket ה-Storage 'media' — לצורך מסך ניהול התוכן (Plan B). לא נוגע בהרשאות הקריאה-בלבד
-- הקיימות על participants/daily_triggers/message_deliveries (Plan D) — אלה נשארות כמו שהן.

create policy content_days_insert_mentor on content_days
  for insert to authenticated
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy content_days_update_mentor on content_days
  for update to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()))
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy content_days_delete_mentor on content_days
  for delete to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));

create policy messages_insert_mentor on messages
  for insert to authenticated
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy messages_update_mentor on messages
  for update to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()))
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy messages_delete_mentor on messages
  for delete to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));

-- Storage RLS (storage.objects) — נפרד מ-RLS על טבלאות ה-public schema. ה-bucket 'media' הוא
-- public=true (כך שקישורי media_url ציבוריים לקריאה, כמו שהוגדר ב-Plan A), אבל זה משפיע רק
-- על SELECT — כתיבה (upload) דורשת policy מפורש גם ב-bucket "ציבורי".
create policy mentors_insert_media on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and exists (select 1 from mentors where user_id = auth.uid()));

create policy mentors_update_media on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and exists (select 1 from mentors where user_id = auth.uid()));

create policy mentors_delete_media on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and exists (select 1 from mentors where user_id = auth.uid()));
