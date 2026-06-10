# Priority Lite — ממשק קל לדיווחי שעות ומשימות מעל Priority ERP

אפליקציית web ‏(PWA, עברית RTL) שעוטפת את Priority בממשק מהיר ופשוט:
טיימר, דיווחי שעות ידניים, סיכומים, וחיפוש משימות. דיווחים נשמרים כטיוטות
מקומיות ונשלחים לפריוריטי רק אחרי אישור.

## מבנה

- `shared/` — טיפוסים משותפים
- `server/` — Hono + SQLite. אימות OTP במייל, תיווך מול Priority REST API
- `client/` — React + Vite + Tailwind + Dexie

## הרצה בפיתוח

```bash
npm install
npm run seed -w server -- ./whitelist.example.json   # טעינת עובדים לדוגמה
npm run dev                                          # שרת (8787) + קליינט (5173)
```

בפיתוח אין צורך ב-.env: המייל מודפס לטרמינל (EMAIL_MODE=console)
והחיבור לפריוריטי מדומה (PRIORITY_MODE=mock).

כניסה: טלפון `0501234567` (מה-whitelist לדוגמה) → הקוד יודפס בטרמינל השרת.

## בדיקות

```bash
npm test
```

## חיבור לפריוריטי אמיתי (M6)

1. למלא את שמות הישויות/שדות ב-`server/src/priority/mapping.ts`
2. להגדיר ב-`server/.env`: `PRIORITY_MODE=real` + `PRIORITY_BASE_URL/COMPANY/USER/PASSWORD`
3. לבדוק מול חברת הטסט לפני production

## הגדרות נוספות

ראה `server/.env.example` לכל משתני הסביבה (Resend למיילים אמיתיים, וכו').
