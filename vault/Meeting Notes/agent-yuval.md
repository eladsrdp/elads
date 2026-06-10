# Agent — יובל (מעצב התמונות)

## Overview
יובל הוא סוכן יצירת תמונות. הוא מקבל prompt (לרוב מתוך `{{IMAGE_NEEDED}}` של יעל), סורק תמונות reference לשמירת עקביות ויזואלית, מנסח prompt מדויק, ומפיק PNG דרך ה-skill `gpt-image-gen` (OpenAI Images API, מודל `gpt-image-2`). כל תמונה נשמרת עם קובץ `.txt` תאום המכיל את ה-prompt ששימש.

## Open Questions
- none

## קבצים משויכים

| קובץ | תיאור |
|------|--------|
| `.claude/agents/yuval.md` | הגדרת הסוכן — flow עבודה, 7 שלבים, כלים |
| `.claude/skills/gpt-image-gen/SKILL.md` | ה-skill לקריאת API — curl + Python fallback, פרמטרים |
| `yuval/reference/Gemini_Generated_Image_7hgmb77hgmb77hgm.png` | תמונת reference לסגנון ויזואלי |
| `yuval/outputs/` | כל התמונות שנוצרו (.png + .txt עם prompt) |

## תמונות output קיימות
| קובץ | תיאור |
|------|--------|
| `yuval/outputs/2026-06-02-battle-fox-elad.png` | תמונת שועל-קרב (גרסה ראשונה) |
| `yuval/outputs/2026-06-02-battle-fox-elad-myface.png` | אותה תמונה עם פנים מותאמות אישית |

## מה יובל לא עושה
- לא כותב תוכן (→ [[agent-yael]])
- לא מחפש מידע (→ [[agent-chen]])
- לא מפעיל סוכנים אחרים (→ [[agent-reuven]])

## Session Log

### 2026-06-02 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד agent יובל, ה-skill, ותמונות ה-output הקיימות.
- **Decisions:** מודל `gpt-image-2` קבוע — לא להחליף גם אם מתקבלת שגיאה (הבעיה היא כמעט תמיד ב-API key).
- **Notes / Caveats:** יובל תלוי ב-`OPENAI_API_KEY` ב-`.env`. ללא מפתח תקף — אין תמונות.
- **Related:** [[agent-reuven]], [[agent-yael]], [[yuval-workspace]], [[skill-gpt-image-gen]], [[env-config]]
