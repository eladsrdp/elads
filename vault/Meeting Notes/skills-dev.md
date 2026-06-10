# Skills — פיתוח כלליים

## Overview
אוסף סקילי infrastructure כללי של Claude Code — אינם ספציפיים לפרויקט הזה אלא מגיעים עם ה-Superpowers plugin. מגדירים תהליכי עבודה מיטביים: brainstorming לפני פיתוח, TDD, debugging שיטתי, code review, ניהול git worktrees, ועוד.

## Open Questions
- none

## קבצים משויכים

| קובץ | תיאור |
|------|--------|
| `.claude/skills/brainstorming/SKILL.md` | חובה לפני כל עבודה יצירתית — בוחן intent לפני implementation |
| `.claude/skills/brainstorming/scripts/` | server.cjs, helper.js, frame-template.html — UI לתהליך ה-brainstorming |
| `.claude/skills/brainstorming/spec-document-reviewer-prompt.md` | prompt לבדיקת spec |
| `.claude/skills/brainstorming/visual-companion.md` | עזר ויזואלי ל-brainstorming |
| `.claude/skills/dispatching-parallel-agents/SKILL.md` | הפעלת מספר agents במקביל עבור משימות עצמאיות |
| `.claude/skills/executing-plans/SKILL.md` | ביצוע תוכנית מוכתבת עם checkpoints |
| `.claude/skills/finishing-a-development-branch/SKILL.md` | סיום branch — merge/PR/cleanup |
| `.claude/skills/receiving-code-review/SKILL.md` | קבלת code review עם ריגור טכני |
| `.claude/skills/requesting-code-review/SKILL.md` | בקשת code review לפני merge |
| `.claude/skills/requesting-code-review/code-reviewer.md` | agent prompt לביצוע review |
| `.claude/skills/subagent-driven-development/SKILL.md` | פיתוח מונע subagents בסשן נוכחי |
| `.claude/skills/subagent-driven-development/implementer-prompt.md` | prompt ל-implementer agent |
| `.claude/skills/subagent-driven-development/spec-reviewer-prompt.md` | prompt לבדיקת spec |
| `.claude/skills/subagent-driven-development/code-quality-reviewer-prompt.md` | prompt לבדיקת איכות קוד |
| `.claude/skills/systematic-debugging/SKILL.md` | debugging שיטתי — root cause לפני fix |
| `.claude/skills/systematic-debugging/root-cause-tracing.md` | מתודולוגיית מעקב אחר שורש הבעיה |
| `.claude/skills/systematic-debugging/defense-in-depth.md` | הגנה בשכבות |
| `.claude/skills/systematic-debugging/condition-based-waiting.md` | המתנה מבוססת תנאי (לא sleep) |
| `.claude/skills/systematic-debugging/find-polluter.sh` | סקריפט למציאת test polluter |
| `.claude/skills/systematic-debugging/CREATION-LOG.md` | לוג יצירת ה-skill |
| `.claude/skills/test-driven-development/SKILL.md` | TDD — כתוב test לפני implementation |
| `.claude/skills/test-driven-development/testing-anti-patterns.md` | anti-patterns שיש להימנע מהם |
| `.claude/skills/using-git-worktrees/SKILL.md` | עבודה ב-git worktrees לבידוד feature branches |
| `.claude/skills/using-superpowers/SKILL.md` | מדריך שימוש ב-Superpowers plugin — חובה בתחילת כל סשן |
| `.claude/skills/using-superpowers/references/codex-tools.md` | reference tools ל-Codex |
| `.claude/skills/using-superpowers/references/copilot-tools.md` | reference tools ל-Copilot |
| `.claude/skills/using-superpowers/references/gemini-tools.md` | reference tools ל-Gemini |
| `.claude/skills/verification-before-completion/SKILL.md` | אימות לפני הכרזת הצלחה — evidence לפני assertions |
| `.claude/skills/writing-plans/SKILL.md` | כתיבת תוכנית לפני מגע בקוד |
| `.claude/skills/writing-plans/plan-document-reviewer-prompt.md` | prompt לבדיקת תוכנית |
| `.claude/skills/writing-skills/SKILL.md` | יצירת ועריכת skills חדשים |
| `.claude/skills/writing-skills/anthropic-best-practices.md` | best practices של Anthropic לכתיבת skills |
| `.claude/skills/writing-skills/persuasion-principles.md` | עקרונות שכנוע לכתיבת skills אפקטיביים |
| `.claude/skills/writing-skills/testing-skills-with-subagents.md` | בדיקת skills עם subagents |
| `.claude/skills/writing-skills/graphviz-conventions.dot` | conventions לתרשימי Graphviz |
| `.claude/skills/writing-skills/render-graphs.js` | script לרינדור גרפים |
| `.claude/skills/writing-skills/examples/CLAUDE_MD_TESTING.md` | דוגמת CLAUDE.md לבדיקות |

## Session Log

### 2026-06-02 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד כל סקילי הפיתוח הכלליים עם תיאור קצר לכל קובץ.
- **Decisions:** קובצו יחד כ"infrastructure" כי אינם ייחודיים לפרויקט הזה.
- **Notes / Caveats:** Superpowers plugin (v5.1.0) הותקן ב-commit 5a4cb01 — הוא מקור רוב הסקילים האלו.
- **Related:** [[project-overview]]
