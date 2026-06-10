# Priority Lite — ממשק קל לדיווחי שעות ומשימות מעל Priority ERP

## Overview
אפליקציית web ‏(PWA, עברית RTL) בתיקייה `priority-lite/` שעוטפת את Priority ERP בממשק מהיר: טיימר, דיווחי שעות ידניים, סיכומים (יום/שבוע/חודש לפי פרויקט→משימה), וחיפוש משימות. ארכיטקטורה: monorepo ‏(npm workspaces) עם `shared/` (טיפוסים), `server/` (Hono + better-sqlite3, אימות OTP במייל לפי whitelist טלפונים, JWT cookie ל-7 ימים, adapter מבודד מול Priority OData עם mock לפיתוח), ו-`client/` (React 19 + Vite 8 + Tailwind v4 + Dexie). דיווחים נשמרים כטיוטות מקומיות ונשלחים לפריוריטי רק אחרי אישור המשתמש (תוצאה פר-פריט, שגיאות עם retry). שכבת actions עם zod schemas מוכנה לחיבור צ'אט-LLM בשלב 3. סטטוס: M0–M5 בנויים ומאומתים מול mock ‏(32 בדיקות + E2E בדפדפן); נותר חיווט אמיתי (M6) ופריסה (M7).

## Open Questions
- **Credentials** ל-API ‏(PRIORITY_USER/PASSWORD) + אישור שיטת auth (Basic/PAT) — חוסם M6
- **RESEND_API_KEY** למיילים אמיתיים — כרגע EMAIL_MODE=console (הקוד מודפס לטרמינל השרת)
- אייקוני PWA הם SVG בלבד — כדאי PNG ‏192/512 להתקנה מלאה באנדרואיד (אפשר דרך יובל)
- אין dedupe מול Priority בכשל רשת אחרי שליחה חלקית — לבדוק ב-M6 (סיכון דיווח כפול)
- זיהוי עובד בפריוריטי הוא לפי **שם עובד** (לא מספר) — של אלעד: `elads`

## Session Log

### 2026-06-10 — תכנון ובניית MVP מלא מול mock [shipped]
- **What was done:** אפיון מלא מול המשתמש (AskUserQuestion ×4 סבבים) → תוכנית מאושרת → בנייה: ~45 קבצים. שרת: env (zod), SQLite ‏(employees+otp_codes), OTP עם rate-limit ‏(3/15דק׳, 5 ניסיונות, תוקף 10דק׳), JWT cookie, email sender ‏(console/Resend), PriorityAdapter + mock ‏(20 משימות עבריות, latency, fail-injection) + שלד odata.ts, שכבת actions, routes. קליינט: Login (טלפון→OTP), Today (טיימר עמיד-reload + סה"כ יומי + FAB), Entries (טיוטות→sync פר-פריט→שגיאות+retry), Summary (יום/שבוע/חודש לפי פרויקט), Settings, Dexie, PWA ‏(manifest+SW). אומת E2E בדפדפן: login→טיימר→reload→stop→drafts→sync ‏(7 הצלחות+1 כשל מבוקר)→summary. 32 בדיקות vitest עוברות, build נקי. המשתמש סיפק: URL אמיתי (base=p.priority-connect.online, tabula=tabba409.ini, company=rdpltd), ישות דיווחי שעות ZRDP_TRANSORDER_q, והוכנס ל-whitelist ‏(0542438624 / elads@rdpri.com / elads).
- **Decisions:** (1) Backend חובה — credentials של פריוריטי לא בדפדפן; משתמש API אחד + שם עובד פר דיווח. (2) טיוטה-קודם: כתיבה לפריוריטי רק אחרי אישור. (3) session 7 ימים (החלטת משתמש). (4) hono+better-sqlite3+jose; zod 3; ללא vite-plugin-pwa — ‏SW ידני (פשטות). (5) טיימר ב-localStorage עם חישוב now-startedAt — שורד reload/sleep; state משותף דרך store מודולרי (useSyncExternalStore) אחרי באג שבו TimerCard ו-Today לא הסתנכרנו. (6) שרת dev מתעלם מ-PORT (השייך ל-Vite/preview) ומשתמש ב-SERVER_PORT/8787, ומגיש client/dist רק בפרודקשן — אחרי שה-preview הזריק PORT=5173 והשרת הגיש build ישן (גרם ל"קוד stale" מבלבל בדיבוג). (7) `node --watch --import tsx` במקום `tsx watch` (לא עולה ב-non-TTY).
- **Notes / Caveats:** mapping.ts עדיין עם TODO לשדות; mock נשאר ברירת מחדל עד M6. seed עובדים: `npm run seed -w server` (קורא whitelist.json, לא ב-git). בפיתוח OTP מודפס לטרמינל — אין מייל אמיתי עד Resend. odata.ts הוא שלד גנרי — ייתכן שדיווח שעות הוא subform ב-Priority וידרוש התאמת נתיב POST.
- **Related:** [[project-overview]], [[cashflow-pulse-app]], [[priority-automations-article]]

### 2026-06-10 — בדיקת סטטוס + תיעוד פר-קובץ [debug]
- **What was done:** אימות בריאות מלא: כל 32 הבדיקות עוברות (19 שרת + 13 קליינט), build קליינט נקי (tsc + vite, ‏~100KB gzip). נוצר תיעוד MD לכל 69 קבצי הפרויקט ב-`vault/File Docs/priority-lite/` (קידומת `pl-`).
- **Decisions:** עודכנו Open Questions — הוסרו שאלות הישויות/שדות: `mapping.ts` כבר מולא בפועל (משימות = `ZRDP_DOCUMENTS_p`, דיווחים = `ZRDP_TRANSORDER_q` עם USERLOGIN/CURDATE/DOCNO/TQUANT/PDES/TRANS; מופה מ-$metadata ב-2026-06-10). נוספו גם scripts/discover.ts ו-smoke.ts ו-lib/api — עבודה לקראת M6 שלא תועדה בסשן קודם.
- **Notes / Caveats:** הפרויקט הועלה לראשונה ל-git כחלק מהגירה ל-repo החדש — ראו [[repo-github-migration]]. עדיין חסר: credentials ל-API ‏(חוסם M6 סופית) ו-RESEND_API_KEY.
- **Related:** [[repo-github-migration]], [[project-overview]]
