# priority-lite/client/public/sw.js

**שייך ל:** priority-lite / קליינט / נכסי PWA

## מה הקובץ עושה
ה-Service Worker של ה-PWA — אסטרטגיית stale-while-revalidate ל-app shell: מגיש מיד מהמטמון ובמקביל מרענן מהרשת. חשוב: בקשות `/api/` במכוון לא נכנסות למטמון בכלל (תמיד רשת בלבד — נתוני שעות חייבים להיות טריים), וכך גם בקשות שאינן GET או מ-origin אחר. ב-activate מנקה מטמונים מגרסאות קודמות. נרשם רק בפרודקשן מתוך main.tsx.

## קבצים קשורים
- [[pl-client-main]] — רושם את ה-SW בפרודקשן בלבד
- [[pl-client-public-manifest]] — משלים את הגדרת ה-PWA
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
