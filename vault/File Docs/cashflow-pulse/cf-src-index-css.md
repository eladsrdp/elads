# cashflow-pulse/src/index.css

**שייך ל:** cashflow-pulse / שכבת ה-UI (עיצוב גלובלי)

## מה הקובץ עושה
עיצוב הבסיס הגלובלי: ייבוא Tailwind CSS (v4, דרך `@import 'tailwindcss'`), הגדרת color-scheme כהה, גובה מלא ל-html/body/#root, פונט Heebo (עם fallbacks) ורקע כהה (slate-900). בנוסף מגדיר את המחלקה `.ltr-nums` שמכריחה מספרים להיקרא משמאל לימין בתוך טקסט RTL — בשימוש נרחב בכל מקום שמוצגים סכומים ותאריכים.

## קבצים קשורים
- [[cashflow-pulse-app]] — קובץ הנושא של הפרויקט
- [[cf-src-main]] — מייבא את הקובץ באתחול
- [[cf-vite-config]] — פלאגין Tailwind שמעבד את ה-import
- [[cf-index-html]] — ה-RTL מוגדר ברמת המסמך שם
