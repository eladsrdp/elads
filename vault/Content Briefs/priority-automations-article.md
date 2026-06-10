# מאמר אוטומציות פריוריטי — AI Agents טרנד 2026

## Overview
מאמר בעברית על הטרנד החם של AI Agents ואוטומציות בפריוריטי ERP, בעקבות השקת V26.0 ו-aiERP Companion במאי 2026. המאמר מכוון למנהלי כספים, פעולות ו-IT בחברות ישראליות. נוצר על ידי הצוות המלא: חן (מחקר), יעל (כתיבה), יובל (תמונות). הקבצים הסופיים נמצאים ב-`Output/2026-06-02-priority-automations.md` ו-`.html`.

## Open Questions
- תמונה 2 (אינפוגרפיקה AI Agents) לא נוצרה — מצריכה OPENAI_API_KEY תקף. Prompt שמור ב-`yuval/outputs/2026-06-02-priority-ai-agents-infographic.txt`

## Session Log

### 2026-06-04 — יצירת מאמר מלא + תמונות [wip]
- **What was done:** חן חיפשה טרנד — מצאה השקת Priority V26.0 (20.5.2026) עם aiERP Companion ו-AI Agents ב-3 מודולים. יעל כתבה מאמר ~780 מילים עם 2 placeholders. יובל יצר תמונה 1 (ממשק ERP ניאון, flat design). תמונה 1 שולבה במאמר. תמונה 2 נכשלה — API key לא תקף.
- **Decisions:** שילוב תמונה 1 הושלם; placeholder של תמונה 2 נשמר בקובץ עד שיהיה API key תקף.
- **Notes / Caveats:** יש לעדכן `OPENAI_API_KEY` ב-`.env` ואז להריץ מחדש את יובל עם `yuval/outputs/2026-06-02-priority-ai-agents-infographic.txt`.
- **Related:** [[agent-chen]], [[agent-yael]], [[agent-yuval]], [[content-pipeline]]
