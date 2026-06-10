# File Docs — cashflow-pulse — Index

תיעוד פר-קובץ של אפליקציית cashflow-pulse.

## Topics
- [[cf-src-types]] — טיפוסי הדומיין המרכזיים: כיסים, תנועות, קבועים, העברות ותוצאות תחזית
- [[cf-src-db-db]] — הגדרת בסיס הנתונים המקומי (Dexie/IndexedDB) ו-seed הכיסים
- [[cf-src-db-operations]] — שכבת CRUD: הוספה/מחיקה/אישור תנועות וייבוא עם דה-דופליקציה
- [[cf-src-engine-forecast]] — מנוע התחזית: חישוב יתרה יומית עד יום היעד והרחבת קבועים/העברות
- [[cf-src-engine-forecast-test]] — בדיקות יחידה למנוע התחזית
- [[cf-src-lib-date]] — עזרי תאריך ISO ב-UTC: יום יעד, טווחים ומופעים חודשיים
- [[cf-src-lib-currency]] — עיצוב סכומים בש"ח (Intl.NumberFormat)
- [[cf-src-lib-backup]] — ייצוא ושחזור כל הנתונים לקובץ JSON
- [[cf-src-state-use-data]] — hooks חיים (useLiveQuery) שמחברים DB ↔ מנוע תחזית
- [[cf-src-import-parse-statement]] — פענוח קבצי Excel/CSV מהבנק: תאריכים, סכומים ומיפוי עמודות
- [[cf-src-import-parse-statement-test]] — בדיקות יחידה לפענוח דפי בנק
- [[cf-src-main]] — נקודת הכניסה: רינדור App תחת StrictMode
- [[cf-src-app]] — קומפוננטת השורש: לשוניות, בחירת כיס ו-seed באתחול
- [[cf-src-screens-dashboard]] — מסך הדופק: יתרה, מדד ה-10, גרף ותנועות צפויות
- [[cf-src-screens-ledger]] — ספר התנועות: צפוי מול בוצע, הוספה ידנית וייבוא
- [[cf-src-screens-bridge]] — גשר ההעברות הקבועות בין הכיס העסקי לביתי
- [[cf-src-screens-settings]] — הגדרות: כיסים, קבועים וגיבוי/שחזור
- [[cf-src-components-bottom-nav]] — ניווט תחתון בסגנון מובייל וטיפוס Tab
- [[cf-src-components-scope-switch]] — מתג בחירת כיס עסקי/ביתי
- [[cf-src-components-pulse-gauge]] — ווידג'ט מדד ה-10: יתרה חזויה, סטטוס ו-shortfall
- [[cf-src-components-flow-chart]] — גרף שטח (Recharts) של התזרים היומי עם קו סף אשראי
- [[cf-src-components-transaction-row]] — שורת תנועה עם אישור ומחיקה
- [[cf-src-components-import-dialog]] — דיאלוג ייבוא תלת-שלבי: קובץ → מיפוי → סיכום
- [[cf-src-components-modal]] — מודאל גנרי מותאם נייד (bottom sheet)
- [[cf-src-components-forms]] — רכיבי טפסים משותפים: Field, TextInput, Select, PrimaryButton
- [[cf-src-index-css]] — עיצוב גלובלי: Tailwind, פונט Heebo, רקע כהה ו-ltr-nums
- [[cf-src-app-css]] — עיצוב שריד מתבנית Vite, לא בשימוש
- [[cf-src-vitest-setup]] — setup לבדיקות: matchers של jest-dom
- [[cf-src-assets-hero]] — תמונת תבנית, לא בשימוש
- [[cf-src-assets-react-svg]] — לוגו React מהתבנית, לא בשימוש
- [[cf-src-assets-vite-svg]] — לוגו Vite מהתבנית, לא בשימוש
- [[cf-index-html]] — דף ה-HTML היחיד: עברית RTL, viewport מובייל ו-PWA links
- [[cf-public-manifest]] — Web App Manifest להתקנה כ-PWA (ללא אייקונים עדיין)
- [[cf-public-favicon]] — אייקון האתר (SVG)
- [[cf-public-icons]] — sprite אייקוני רשתות חברתיות מהתבנית, ככל הנראה לא בשימוש
- [[cf-package-json]] — מניפסט npm: סקריפטים ותלויות (React 19, Dexie, Recharts, xlsx)
- [[cf-package-lock]] — נעילת גרסאות תלויות (נוצר אוטומטית)
- [[cf-vite-config]] — תצורת Vite: פלאגיני React + Tailwind והגדרות Vitest
- [[cf-tsconfig]] — תצורת TypeScript ראשית (project references)
- [[cf-tsconfig-app]] — תצורת TypeScript לקוד האפליקציה
- [[cf-tsconfig-node]] — תצורת TypeScript לקבצי build (vite.config)
- [[cf-eslint-config]] — תצורת ESLint flat: TS, react-hooks, react-refresh
- [[cf-readme]] — README גנרי של תבנית Vite, טרם עודכן לאפליקציה
- [[cf-gitignore]] — רשימת התעלמות git סטנדרטית של תבנית Vite
