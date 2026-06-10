# Content Pipeline — Content/ ו-Output/

## Overview
שתי תיקיות מרכזיות בזרימת תוכן הפרויקט. `Content/` היא תיבת הדואר הנכנס — חן מניחה כאן חומר גלם שמשכה מהרשת. `Output/` היא תיבת הדואר היוצא — יעל שומרת כאן את המאמרים המוגמרים (MD + HTML), כולל תמונות משולבות לאחר עיבוד יובל.

## Open Questions
- none

## קבצים משויכים

| קובץ | מי יצר | תיאור |
|------|---------|--------|
| `Content/2026-06-02-make-com-trends.md` | [[agent-chen]] | מאמר גלם על טרנדים ב-Make.com — מחכה לשכתוב |
| `Content/Gemini_Generated_Image_7hgmb77hgmb77hgm.png` | — | תמונה שנמצאה בזמן מחקר |
| `Content/מאמר CRM.txt` | — | חומר גלם על CRM בעברית |
| `Output/מאמר CRM.md` | [[agent-yael]] | גרסת Markdown מוגמרת של מאמר CRM |
| `Output/מאמר CRM.html` | [[agent-yael]] | גרסת HTML מעוצבת של מאמר CRM |

## זרימת Content

```
חן → Content/<date>-<slug>.md
                 ↓
יעל ← קורא מ-Content/
יעל → Output/<name>.md + Output/<name>.html
                 ↓
יובל → yuval/outputs/<date>-<slug>.png
                 ↓
ראובן משלב תמונות → Output/ (final)
```

## Session Log

### 2026-06-02 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד pipeline התוכן וקבצי Content/Output הקיימים.
- **Decisions:** Content/ = input (גלם), Output/ = output (מוגמר). לא לערבב.
- **Notes / Caveats:** קבצי Output שעדיין מכילים `{{IMAGE_NEEDED}}` הם חצי-מוגמרים — יובל עוד לא עיבד אותם.
- **Related:** [[agent-chen]], [[agent-yael]], [[agent-yuval]], [[agent-reuven]]
