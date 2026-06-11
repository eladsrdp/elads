# Priority Lite — ממשק קל לדיווחי שעות ומשימות מעל Priority ERP

## Overview
אפליקציית web ‏(PWA, עברית RTL) בתיקייה `priority-lite/` שעוטפת את Priority ERP בממשק מהיר: טיימר, דיווחי שעות ידניים, סיכומים (יום/שבוע/חודש לפי פרויקט→משימה), וחיפוש משימות. ארכיטקטורה: monorepo ‏(npm workspaces) עם `shared/` (טיפוסים), `server/` (Hono + better-sqlite3, אימות OTP במייל לפי whitelist טלפונים, JWT cookie ל-7 ימים, adapter מבודד מול Priority OData עם mock לפיתוח), ו-`client/` (React 19 + Vite 8 + Tailwind v4 + Dexie). דיווחים נשמרים כטיוטות מקומיות ונשלחים לפריוריטי רק אחרי אישור המשתמש (תוצאה פר-פריט, שגיאות עם retry). שכבת actions עם zod schemas מוכנה לחיבור צ'אט-LLM בשלב 3. סטטוס: M0–M5 בנויים ומאומתים מול mock ‏(32 בדיקות + E2E בדפדפן); מיילים אמיתיים דרך Resend פעילים; **קריאה אמיתית מפריוריטי אומתה בפרודקשן** (PAT + Basic auth, ‏getTimeEntries דרך scripts/report.ts); נותר אימות כתיבה, מעבר PRIORITY_MODE=real ופריסה (M7).

## Open Questions
- **Supabase**: ה-URL נשמר ב-.env (uryyijvcafmzqjuqankl); עדיין חסר service_role key + הרצת supabase-schema.sql + seed. עד שכולם קיימים — נשאר Local mode (factory דורש URL וגם key).
- **כתיבה לפריוריטי עם השדות החדשים** (billable/ordName/ordLine) — עדיין לא נבדקה מול אמת (smoke.ts write בחברת טסט)
- **Resend domain** — whitelist רשום עם @dpri.com אבל Resend (בלי דומיין מאומת) שולח רק ל-elads@rdpri.com. להדגמה מקומית עברנו ל-EMAIL_MODE=console (קוד בטרמינל). למיילים אמיתיים לכל העובדים — לאמת דומיין.
- אין dedupe מול Priority בכשל רשת אחרי שליחה חלקית — סיכון דיווח כפול
- אייקוני PWA הם SVG בלבד — כדאי PNG ‏192/512 (יובל)
- **פיצ'ר AI parse** — שיוך פרויקט (taskId) עובד כשהשם מצוין במפורש; בקלט גנרי עדיין null. דיווחים ללא משימה נשמרים כטיוטה ומסומנים "⚠ לא זוהתה משימה" — המשתמש בוחר בעריכה.
- **הקלטה קולית** — Web Speech API לא אמין מחוץ ל-Chrome רשמי ובטלפונים. תוכנן מעבר ל-MediaRecorder→Gemini (audio), אך המשתמש דיווח שאצלו ההקלטה עובדת — נדחה עד שיתעורר צורך אמיתי.

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

### 2026-06-10 — בדיקת משתמש ראשונה + חיבור Resend למיילים אמיתיים [shipped]
- **What was done:** המשתמש בדק את האפליקציה בדפדפן. תקלה ראשונה ("לא נכנס") — שרת ה-dev נפל בין סשנים; אחרי הרמה מחדש אומת מסלול ההתחברות E2E ‏(request-otp → קוד בלוג → verify-otp → 200 + session). המשתמש סיפק RESEND_API_KEY; הוגדר ב-.env ‏(EMAIL_MODE=resend), השרת אותחל, ונשלח מייל OTP אמיתי ל-elads@rdpri.com בהצלחה.
- **Decisions:** המפתח נשמר רק ב-`priority-lite/server/.env` (מוחרג מ-git); הומלץ למשתמש לסובב את המפתח כי עבר בצ'אט. התגלה גם ש-PAT לפריוריטי כבר קיים ב-.env — עודכנה השאלה הפתוחה: החסם ל-M6 הוא רק מעבר ל-PRIORITY_MODE=real ואימות.
- **Notes / Caveats:** ‏Resend ללא דומיין מאומת שולח רק לכתובת ההרשמה מ-onboarding@resend.dev — אם מוסיפים עובדים נוספים ל-whitelist יידרש אימות דומיין rdpri.com. ‏node --watch לא טוען מחדש .env — שינוי env מחייב restart מלא.
- **Related:** [[repo-github-migration]], [[env-config]]

### 2026-06-10 — דוח שעות ראשון מפריוריטי אמיתי — קריאה אומתה בפרודקשן [shipped]
- **What was done:** נוסף `scripts/report.ts` — דוח שעות CLI ‏(ברירת מחדל 7 ימים אחרונים, או טווח כפרמטרים) שמשתמש ב-adapter הקיים. הופק דוח אמיתי ראשון למשתמש: 29:30 שעות / 16 דיווחים בטווח 4–10.6, מקובץ לפי יום ולפי פרויקט.
- **Decisions:** זו האימות הראשון של צד הקריאה של M6 בפרודקשן — ה-PAT ב-.env עובד עם Basic auth, המיפוי ב-mapping.ts נכון (כל השדות חזרו מאוכלסים). ה-Overview עודכן בהתאם.
- **Notes / Caveats:** צד הכתיבה (createTimeEntry) עדיין לא נבדק מול אמת — לבדוק עם `smoke.ts write` רק בחברת טסט. הדוח רץ דרך Bash (פלט עברית ב-PowerShell 5.1 משתבש בקידוד).
- **Related:** [[repo-github-migration]], [[priority-automations-article]]

### 2026-06-10 — מיגרציה מ-SQLite ל-Supabase + הכנה ל-Vercel [shipped]
- **What was done:** הוחלפה השכבת DB מ-better-sqlite3 ל-Supabase ‏(PostgreSQL over HTTP): כל פעולות ה-DB הפכו async; נוצר `supabase-schema.sql` ‏(employees + otp_codes, ‏RLS disabled); עודכנו `env.ts` ‏(SUPABASE_URL + SUPABASE_SERVICE_KEY), `db.ts`, `otp.ts`, `auth.ts`, `index.ts`, `seed-whitelist.ts`. נוצרו `api/index.ts` ‏(serverless entry ל-Vercel דרך `@hono/node-server/toNodeHandler`) ו-`vercel.json` עם rewrites. Docker files נשארו ב-repo אך הפריסה עברה ל-Vercel.
- **Decisions:** SQLite אינה מתאימה ל-Vercel ‏(serverless, ‏no persistent FS). Supabase נבחרה כי היא מנוהלת, ‏free tier, ופשוטה לשילוב. שימוש ב-service_role key (עוקף RLS) — מקובל כי השרת מאמת משתמשים בעצמו. OTP attempts increment: שינוי מ-atomic SQL ל-read-then-write (race condition נדיר, סיכון מקובל).
- **Notes / Caveats:** עדיין נדרש ידנית: יצירת Supabase project + הרצת schema + seed עובדים מחדש + Vercel env vars. Dockerfile נשאר ב-repo.
- **Related:** [[repo-github-migration]], [[env-config]]

### 2026-06-11 — הוספת שדות billable / ordName / ordLine לדיווחי שעות [shipped]
- **What was done:** הוספו 3 שדות חדשים לאורך כל ה-stack: `FLAG` (billable=Y), `ORDNAME` ‏(מספר הזמנה), `OLINE` ‏(שורת הזמנה). שדות מופו ב-`mapping.ts`, נוספו ל-`NewTimeEntry` ב-`adapter.ts`, ל-`createTimeEntry` ב-`odata.ts`, לסכמת zod ב-`actions/index.ts` (כולל העברה ל-adapter), ל-sync payload ב-`useEntries.ts`, ולטיפוסים ב-`shared/types.ts` ו-`client/types.ts`. UI: דגל billable תמיד גלוי ‏(toggle ירוק), סקשן "פרטים נוספים" מתקפל עם שדות ORDNAME + OLINE ב-`ManualEntryModal.tsx`.
- **Decisions:** ordName/ordLine בסקשן מתקפל כי נדרשים רק לחלק מהלקוחות (פיק אנד פאק, שחר תשלובות). billable גלוי תמיד כי רלוונטי לכלל הלקוחות. שני שדות ORDNAME+OLINE מספיקים לשני הלקוחות — שניהם השתמשו באותו pattern (ORDNAME=SO24000058 + OLINE).
- **Notes / Caveats:** כתיבה לפריוריטי עדיין לא נבדקה עם השדות החדשים — יש לאמת מול חברת טסט.
- **Related:** [[repo-github-migration]]

### 2026-06-11 — Local DB fallback + רענון פרויקטים + AI parse (Gemini) [shipped]
- **What was done:** שלוש מטרות להדגמה מקומית היום. (1) **Dual DB**: רפקטור ל-`AppDB` interface עם שני מימושים — `supabase-impl.ts` ו-`local-impl.ts` (in-memory + whitelist.json). `createDb` בוחר Supabase רק אם URL+key קיימים, אחרת Local. ‏SUPABASE_URL/KEY הפכו optional ב-env.ts → השרת קם בלי Supabase. ‏otp.ts ו-context.ts עברו ל-AppDB; ‏seed עודכן. בדיקות otp עודכנו ל-async מול createLocalDb. (2) **רענון פרויקטים**: כפתור ↻ ב-TaskPicker שמנקה את ה-cache ומושך מחדש מפריוריטי. (3) **AI parse**: `routes/parse.ts` — ‏POST /api/parse-entry, פענוח טקסט חופשי עברי ל-JSON מובנה. `AiEntryModal.tsx` עם תיבת טקסט + מיקרופון (Web Speech API, he-IL) → ממלא את ManualEntryModal דרך prop חדש `initialValues`. כפתור צף סגול ✦ ב-Today.
- **Decisions:** Local mode הוא ברירת המחדל להדגמה — אפס תלויות חיצוניות. **AI עבר מ-Anthropic ל-Gemini** כי למשתמש יש מפתח Gemini (לא Anthropic): ‏gemini-2.5-flash דרך REST ב-fetch (בלי SDK), `thinkingConfig.thinkingBudget=0` ‏(משימת חילוץ — לא צריך thinking, חוסך טוקנים; עם thinking דלוק ו-512 טוקנים קיבלנו תשובה ריקה). הוסר `@anthropic-ai/sdk`. גוף שגיאה מ-Gemini לא נחשף ללקוח (רק status). **EMAIL_MODE=console** להדגמה — Resend בלי דומיין מאומת שולח רק ל-elads@rdpri.com וה-whitelist הוא @dpri.com, אז OTP מודפס לטרמינל.
- **Notes / Caveats:** באג בטסט ולא בקוד: ‏curl `-d` ב-bash על Windows משבש UTF-8 עברי → פענוח שגוי בטסט; עם `--data-binary @file` (UTF-8) ה-route עובד מושלם. הקליינט שולח UTF-8 דרך fetch אז תקין. אומת E2E: ‏login (console OTP) → parse "שעתיים וחצי על תמיכה היום, לחיוב" → {durationMin:150, note:"תמיכה", billable:true}. ‏taskId עדיין null בקלט גנרי. ‏GEMINI_API_KEY רק ב-.env (מוחרג). בעיה חוזרת בדיבוג: שרתי node מרובים נתקעים על 8787 בין קריאות Bash — לנקות עם `Get-Process node | Stop-Process` לפני בדיקה.
- **Related:** [[repo-github-migration]], [[env-config]]

### 2026-06-11 — אימות E2E בדפדפן + סינון פרויקטים לסטטוס טיוטא [shipped]
- **What was done:** (1) אימות ויזואלי מלא בדפדפן (preview): login עם OTP מהטרמינל → בורר משימות טען 280 פרויקטים אמיתיים מפריוריטי + כפתור רענון → דיווח ידני נשמר → **פיצ'ר ה-AI אומת מקצה לקצה**: "עבדתי שעתיים ורבע על תחרות חדשנות RDP היום, לחיוב, הזמנה SO24000058 שורה 2" → Gemini החזיר {taskId:PR26000025 (זוהה!), durationMin:135, ordName:SO24000058, ordLine:2, billable:true, date:היום} → הטופס נפתח ממולא במלואו → טיוטה נשמרה. (2) **סינון סטטוס**: בורר הפרויקטים מציג רק `activeStatuses=['טיוטא']` (חדש ב-mapping.ts), מסנן ב-fetchAllTasks ב-odata.ts. אומת מול אמת: 309 פרויקטים = 280 טיוטא + 3 סופית + 26 מבוטלת; אחרי סינון רק 280 הטיוטא מוצגים.
- **Decisions:** allow-list (`includes(status.trim())`) ולא deny-list — "רק טיוטא" כבקשת המשתמש, כך פרויקטים סגורים (סופית/מבוטלת) שאי אפשר לדווח עליהם לא מופיעים. הסטטוס המותר ב-mapping.ts כי זה ידע פריוריטי-ספציפי.
- **Notes / Caveats:** הסינון משפיע גם על cache (TTL 5דק') — node --watch מאפס cache על reload. ה-UTF-8 דרך fetch בדפדפן עובד מצוין (להבדיל מ-bash curl). הקלטה קולית: המשתמש דיווח שעובדת אצלו, לא נדרש שינוי.
- **Related:** [[repo-github-migration]]

### 2026-06-11 — AI parse: כמה דיווחים מקלט אחד [shipped]
- **What was done:** פיצ'ר ה-AI תומך כעת בכמה דיווחים מטקסט/הקלטה אחת. `parse.ts` מחזיר `entries[]` (הפרומפט מנחה לפצל משימות/זמנים שונים; השרת מנרמל מערך/אובייקט/בודד ל-`{entries}`). `AiEntryModal` הפך לדו-מצבי: קלט → **תצוגה מקדימה** של כל הדיווחים שזוהו (כרטיס לכל אחד עם משך/תאריך/חיוב/הזמנה + כפתור הסרה + "חזרה") → "הוסף N דיווחים כטיוטות". זיהוי קולי הוגדר `continuous=true` למשפטים ארוכים. `Today.handleConfirm` יוצר טיוטה לכל דיווח. הוסר ה-flow הישן של pre-fill למודל בודד (התצוגה המקדימה מחליפה אותו; ‏`initialValues` ב-ManualEntryModal נשאר אך לא בשימוש).
- **Decisions:** תצוגה מקדימה + "שמור הכל" במקום שרשור מודלים — מאפשר לראות שה-AI חילק נכון ולהסיר טעויות לפני שמירה. דיווח בלי משימה מזוהה נשמר כטיוטה ומסומן, נערך אח"כ דרך השורה ב"היום".
- **Notes / Caveats:** אומת E2E בדפדפן: "שעתיים על מיטל אדמוני היום לחיוב, ושעה וחצי על הליון אתמול" → 2 טיוטות: מיטל אדמוני (PR26000029, 120, היום, billable) + הליון (PR26000034, 90, אתמול). שיוך פרויקט, משך, תאריך (היום/אתמול) וחיוב — כולם נכונים. נבדק מול Dexie ישירות.
- **Related:** [[repo-github-migration]]
