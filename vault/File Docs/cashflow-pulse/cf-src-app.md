# cashflow-pulse/src/App.tsx

**שייך ל:** cashflow-pulse / שכבת ה-UI (קומפוננטת השורש)

## מה הקובץ עושה
קומפוננטת השורש של האפליקציה. באתחול מריצה `ensureSeeded()` ליצירת הכיסים ומציגה "טוען…" עד שה-DB מוכן. מחזיקה שני state עיקריים: הלשונית הפעילה (`Tab` — dashboard/ledger/bridge/settings) והכיס הנבחר (`ScopeId` — עסקי/ביתי). מרנדרת layout מובייל (max-w-md) עם כותרת בעברית לפי הלשונית, `ScopeSwitch` במסכי דופק וספר בלבד, את המסך הפעיל, ו-`BottomNav` קבוע בתחתית.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-main]] — נקודת הכניסה שמרנדרת את App
- [[cf-src-db-db]] — ensureSeeded באתחול
- [[cf-src-components-bottom-nav]] — ניווט הלשוניות
- [[cf-src-components-scope-switch]] — מתג הכיס העסקי/ביתי
- [[cf-src-screens-dashboard]] — מסך הדופק
- [[cf-src-screens-ledger]] — ספר התנועות
- [[cf-src-screens-bridge]] — גשר ההעברות
- [[cf-src-screens-settings]] — מסך ההגדרות
