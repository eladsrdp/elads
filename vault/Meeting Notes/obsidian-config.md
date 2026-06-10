# Obsidian Config — .obsidian/

## Overview
הגדרות Obsidian לפרויקט. תיקיית `.obsidian/` מכילה קבצי JSON שמגדירים את הופעת ה-vault, plugins מופעלים, ומצב ה-workspace האחרון. הפרויקט מוגדר כ-Obsidian vault שמאפשר לפתוח את תיקיית הפרויקט ישירות ב-Obsidian לצפייה ועריכה.

## Open Questions
- none

## קבצים משויכים

| קובץ | תיאור |
|------|--------|
| `.obsidian/app.json` | הגדרות אפליקציה כלליות (editor, reading view, וכד') |
| `.obsidian/appearance.json` | עיצוב: theme, font, צבעים |
| `.obsidian/core-plugins.json` | אילו core plugins מופעלים (graph view, search, וכד') |
| `.obsidian/workspace.json` | מצב ה-workspace האחרון (פאנלים פתוחים, קובץ אחרון) |

## מבנה ה-vault
ה-vault הוא שורש הפרויקט כולו. ב-Obsidian אפשר לנווט ל:
- `vault/` — הזיכרון המתועד (Meeting Notes, Content Briefs, וכד')
- `yael/`, `yuval/`, `chen/` — workspaces של הסוכנים
- `Content/`, `Output/` — pipeline התוכן

## Session Log

### 2026-06-02 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד הגדרות Obsidian של הפרויקט.
- **Decisions:** כל שורש הפרויקט הוא vault אחד — מאפשר wikilinks בין כל הקבצים.
- **Notes / Caveats:** workspace.json משתנה בכל פתיחת Obsidian — לא כדאי לבדוק אותו ב-git reviews.
- **Related:** [[skills-obsidian]], [[project-overview]]
