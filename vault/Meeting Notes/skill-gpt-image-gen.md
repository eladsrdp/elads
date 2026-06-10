# Skill — gpt-image-gen

## Overview
Skill ייעודי ליצירת תמונות דרך OpenAI Images API. מקבל prompt ונתיב פלט, קורא ל-API עם מודל `gpt-image-2`, ושומר את התמונה כ-PNG. כולל שני מסלולים: curl+jq (ראשי) ו-Python (fallback לסביבות Windows ללא jq). משמש אך ורק את [[agent-yuval]].

## Open Questions
- none

## קבצים משויכים

| קובץ | תיאור |
|------|--------|
| `.claude/skills/gpt-image-gen/SKILL.md` | הגדרת ה-skill — פרמטרים, curl, Python fallback, אימות |

## פרמטרים קבועים

| פרמטר | ערך |
|--------|------|
| `model` | `gpt-image-2` (לא לשנות!) |
| `size` | `1024x1024` |
| `quality` | `medium` |
| `output_format` | `png` |

## תלויות
- `OPENAI_API_KEY` ב-`.env` — ראה [[env-config]]
- `curl` + (`jq` או `python`) בסביבת ריצה

## Session Log

### 2026-06-02 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד skill gpt-image-gen.
- **Decisions:** Python fallback קריטי לסביבת Windows שבה jq לא מובטח.
- **Notes / Caveats:** שגיאת API = בעיה ב-key/params, לא בשם המודל. לא להחליף את `gpt-image-2`.
- **Related:** [[agent-yuval]], [[env-config]]
