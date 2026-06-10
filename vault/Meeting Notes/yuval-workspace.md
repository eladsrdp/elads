# Yuval Workspace — yuval/

## Overview
סביבת העבודה של [[agent-yuval]]. מכילה תמונות reference לסגנון ויזואלי עקבי, ותיקיית outputs שבה נשמרות כל התמונות שנוצרו עם prompt התאום שלהן.

## Open Questions
- none

## קבצים משויכים

| קובץ | תיאור |
|------|--------|
| `yuval/reference/Gemini_Generated_Image_7hgmb77hgmb77hgm.png` | תמונת reference ויזואלית — יובל לומד ממנה סגנון, פלטת צבעים וקומפוזיציה |
| `yuval/outputs/2026-06-02-battle-fox-elad.png` | תמונה: שועל קרב (גרסה בסיסית) |
| `yuval/outputs/2026-06-02-battle-fox-elad.txt` | ה-prompt המלא ששימש לתמונה לעיל |
| `yuval/outputs/2026-06-02-battle-fox-elad-myface.png` | תמונה: שועל קרב עם פנים מותאמות אישית |
| `yuval/outputs/2026-06-02-battle-fox-elad-myface.txt` | ה-prompt המלא לגרסה עם הפנים |

## מבנה outputs
כל תמונה מגיעה עם קובץ `.txt` תאום — זה מאפשר לאיטרציה עתידית לראות בדיוק מה עבד.

## Session Log

### 2026-06-02 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד workspace של יובל, reference ו-outputs.
- **Decisions:** שמירת prompt כ-.txt לצד כל תמונה — קריטי לחזרה על סגנון מוצלח.
- **Notes / Caveats:** reference קיים כרגע הוא תמונה אחת בלבד — ככל שמוסיפים reference, העקביות משתפרת.
- **Related:** [[agent-yuval]], [[skill-gpt-image-gen]]
