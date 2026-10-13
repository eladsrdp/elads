-- hachamama-parenting-program/server/migrations/0009_deliveries_cascade_on_message_delete.sql
-- מאפשר למחוק הודעה מטבלת התכנים (/content) גם אם כבר יש לה message_deliveries (נשלחה/מתוזמנת).
-- עד עכשיו ה-FK message_deliveries.message_id חסם את המחיקה (והמנחות גם אין הרשאת DELETE על
-- message_deliveries, ראו 0003) — מחיקה "נכשלה בשקט". עם ON DELETE CASCADE, מחיקת הודעה מוחקת
-- אוטומטית את ה-deliveries שלה (פעולת FK רצה עם הרשאות הבעלים, עוקפת RLS).
-- שים לב: היסטוריית "מי קיבל את ההודעה הזו" נמחקת יחד איתה.
alter table message_deliveries
  drop constraint if exists message_deliveries_message_id_fkey;

alter table message_deliveries
  add constraint message_deliveries_message_id_fkey
  foreign key (message_id) references messages(id) on delete cascade;
