-- hachamama-parenting-program/server/migrations/0010_participant_timezone.sql
-- אזור-זמן פר-משתתפת — כדי שמשפחה בחו"ל (למשל ארה"ב) תקבל את ההודעות בשעון המקומי שלה.
-- calendar_date (ב-daily_triggers) ו-day1_date הם תאריכים *מקומיים* באזור הזה; שעות השליחה
-- (06:45 לטריגר הבוקר, send_offset_time של כל הודעה, 14:00 להודעת יעד) נמדדות גם הן לפיו.
-- ברירת המחדל Asia/Jerusalem שומרת על ההתנהגות של כל המשתתפות הקיימות בדיוק כמו היום.
-- ולידציה של שם IANA נעשית באפליקציה (zod + luxon), לא כאן — אין CHECK מעשי ל-IANA ב-SQL.
-- SECURITY: אין צורך ב-policy חדש — participants_update_mentor הקיימת (0002/0003) כבר חלה על כל העמודות.
-- חשוב: להריץ את המיגרציה *לפני* פריסת הקוד — הדשבורד וה-API קוראים את העמודה הזו.
alter table participants
  add column if not exists timezone text not null default 'Asia/Jerusalem';
