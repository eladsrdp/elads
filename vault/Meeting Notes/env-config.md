# Environment Config — .env ומפתחות API

## Overview
הגדרות הסביבה של הפרויקט. קובץ `.env` (לא ב-git) מכיל את מפתחות ה-API האמיתיים. קובץ `.env.example` (ב-git) הוא התבנית הציבורית. שני מפתחות נדרשים: Anthropic לסוכנים הטקסטואליים, OpenAI לתמונות.

## Open Questions
- none

## קבצים משויכים

| קובץ | תיאור |
|------|--------|
| `.env` | מפתחות אמיתיים — **לא ב-git**, מוחרג ב-.gitignore |
| `.env.example` | תבנית — מראה אילו משתנים נדרשים, ערכים ריקים |
| `.claude/settings.local.json` | הגדרות Claude Code מקומיות — **לא ב-git** |
| `.claude/launch.json` | הגדרות launch של Claude Code |

## משתני סביבה

| משתנה | לשימוש | הכרחי |
|--------|---------|--------|
| `ANTHROPIC_API_KEY` | ראובן + כל הסוכנים (Claude) | כן |
| `OPENAI_API_KEY` | [[agent-yuval]] + [[skill-gpt-image-gen]] | כן (לתמונות) |
| `TAVILY_API_KEY` | [[agent-chen]] — חיפוש אינטרנט משופר | אופציונלי |

## Session Log

### 2026-06-02 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד קבצי config וסביבה.
- **Decisions:** שני מפתחות הכרחיים — ללא OPENAI_API_KEY יובל לא יוכל לייצר תמונות; ללא ANTHROPIC_API_KEY אין פרויקט.
- **Notes / Caveats:** לעולם לא להעלות `.env` ל-git. settings.local.json גם לא ב-git (הגדרות אישיות של המכשיר).
- **Related:** [[agent-yuval]], [[skill-gpt-image-gen]], [[agent-chen]]
