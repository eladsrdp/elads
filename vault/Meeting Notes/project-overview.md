# Project Overview — מערכת צוות הסוכנים

## Overview
מערכת multi-agent ליצירת תוכן, המורכבת מ-4 סוכנים שעובדים יחד בתיאום. ראובן (CLAUDE.md) הוא המנכ"ל שמקבל בקשות ומנתב לסוכן המתאים: חן מוצאת מקורות מהרשת, יעל כותבת/שוכתבת תוכן, ויובל מייצר תמונות. הפרויקט פועל עם Claude (Anthropic API) לסוכנים הטקסטואליים ו-OpenAI Images API ליצירת תמונות.

## Open Questions
- none

## Session Log

### 2026-06-02 — יצירת vault תיעוד ראשוני [shipped]
- **What was done:** סריקה מלאה של כל קבצי הפרויקט (76 קבצים) ויצירת vault תיעוד ב-Obsidian. נוצרו קבצי MD לכל קומפוננטה מרכזית עם wikilinks בין הקבצים.
- **Decisions:** תיעוד לפי קומפוננטות לוגיות (לא קובץ-לקובץ מילולי) כי 76 קבצים נפרדים היה מייצר vault לא שמיש. כל topic מכסה קבוצה קוהרנטית.
- **Notes / Caveats:** הסקילים הכלליים (brainstorming, TDD וכד') קובצו יחד ב-skills-dev כי הם לא ספציפיים לפרויקט הזה — הם infrastructure כללי של Claude Code.
- **Related:** [[agent-reuven]], [[agent-chen]], [[agent-yael]], [[agent-yuval]], [[content-pipeline]]
