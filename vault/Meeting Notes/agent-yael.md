# Agent — יעל (כותבת התוכן)

## Overview
יעל היא סוכן כתיבה ועריכה. היא מקבלת קובץ גלם מ-`Content/`, קוראת את מדריך הסגנון ודוגמאות הבית, ומשכתבת בסגנון המדויק של הארגון. בזמן הכתיבה היא מסמנת מקומות לתמונות עם `{{IMAGE_NEEDED: "..."}}`. הפלט הסופי נשמר ב-`Output/` בשני פורמטים: MD ו-HTML.

## Open Questions
- none

## קבצים משויכים

| קובץ | תיאור |
|------|--------|
| `.claude/agents/yael.md` | הגדרת הסוכן — flow עבודה, כללים, כלים |
| `yael/style-guide.md` | מדריך הסגנון: טון, מבנה, אוצר מילים, HTML template |
| `yael/reference/example-short-use-cases.md` | דוגמת כתיבה — קצר ופרקטי |
| `yael/reference/example-whatsapp-guide.md` | דוגמת כתיבה — מדריך טכני בסגנון הבית |
| `yael/reference/README.md` | הסבר על תיקיית ה-reference |
| `Output/` | תיקיית פלט — מאמרים מוגמרים (.md + .html) |

## סגנון הכתיבה (תמצות מ-style-guide.md)
- **טון:** מקצועי-חברותי, ישיר, אנושי, כן
- **מבנה:** פותח בשאלה, גוף בשכבות פשוט-למורכב, סיום קצר
- **אסור:** שפה פורמלית, פסקאות ארוכות, CTAs, שפת מכירות
- **HTML:** RTL, font Segoe UI, max-width 720px, נקי

## מה יעל לא עושה
- לא מחפשת באינטרנט (→ [[agent-chen]])
- לא יוצרת תמונות — רק מסמנת `{{IMAGE_NEEDED}}` (→ [[agent-yuval]])
- לא מפעילה סוכנים אחרים (→ [[agent-reuven]])

## Session Log

### 2026-06-02 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד agent יעל, מדריך הסגנון ודוגמאות ה-reference.
- **Decisions:** מנגנון `{{IMAGE_NEEDED}}` הוא הממשק בין יעל ליובל — חשוב לשמור על הפורמט המדויק.
- **Notes / Caveats:** יעל לא משנה עובדות, נתונים או ציטוטים — רק סגנון וניסוח.
- **Related:** [[agent-reuven]], [[agent-yuval]], [[yael-workspace]], [[content-pipeline]]
