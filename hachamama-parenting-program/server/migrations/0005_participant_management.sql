-- hachamama-parenting-program/server/migrations/0005_participant_management.sql
-- מוסיף למנחות (טבלת mentors, ראו 0002_mentor_rls.sql) גישת read-write על participants —
-- עד עכשיו היה להן רק SELECT (Plan D). גם מוסיף עמודת assigned_mentor_id (תגית ארגונית
-- בלבד — לא משנה מי רואה מה; כל מנחה עדיין רואה את כל הנרשמים, בכוונה, ראו design doc
-- § "דשבורד מנחות"). וגם policy חדש שמאפשר למנחה לראות את *כל* שורות mentors (לא רק
-- את עצמה) — נדרש כדי להציג רשימת בחירה "הצמד מנחה" במסך.

alter table participants add column assigned_mentor_id uuid references mentors(user_id);

create policy participants_insert_mentor on participants
  for insert to authenticated
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy participants_update_mentor on participants
  for update to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()))
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy participants_delete_mentor on participants
  for delete to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));

-- מנחה יכולה כבר לראות את עצמה (mentors_select_self, 0002) — זה מוסיף ראייה של *כל* השורות,
-- כדי שרשימת "הצמד מנחה" תציג את כל המנחות הקיימות, לא רק את המנחה המחוברת.
create policy mentors_select_all on mentors
  for select to authenticated
  using (exists (select 1 from mentors m where m.user_id = auth.uid()));
