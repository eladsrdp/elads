-- hachamama-parenting-program/server/migrations/0006_mentor_phone.sql
-- מוסיף עמודת טלפון למנחות — נדרש למסך /mentors/new (mentor-dashboard) שיוצר מנחות
-- חדשות עם סיסמת Auth = הטלפון שלהן, ורוצה להציג/לזהות את הטלפון גם מה-mentors.
-- Nullable בכוונה: מנחות קיימות (למשל elads@rdpri.com) לא נוצרו עם טלפון.

alter table mentors add column phone text;
