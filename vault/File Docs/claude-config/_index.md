# File Docs — claude-config — Index

תיעוד פר-קובץ של תצורת ‎.claude/‎ (סוכנים, סקילים, הגדרות).

## Topics

### סוכנים
- [[cc-agent-yael]] — יעל, כותבת התוכן (שכתוב/עריכה/תרגום/סיכום)
- [[cc-agent-yuval]] — יובל, מעצב התמונות (יצירת תמונות דרך gpt-image-gen)
- [[cc-agent-chen]] — חן, חוקרת הרשת (חיפוש מקורות אמיתיים ל-Content/)

### הגדרות
- [[cc-settings-json]] — הגדרות משותפות: hook להפעלת obsidian-vault-workflow
- [[cc-settings-local-json]] — הגדרות מקומיות: רשימת הרשאות (permissions.allow)
- [[cc-launch-json]] — תצורות הרצה: priority-lite, cashflow, שרת ויזואליזציה

### סקילים — צוות הסוכנים
- [[cc-skill-gpt-image-gen]] — wrapper ל-OpenAI Images API (מודל gpt-image-2)
- [[cc-skill-obsidian-vault-workflow]] — פרוטוקול הקריאה/כתיבה החובה ב-vault
- [[cc-skill-obsidian-markdown]] — כתיבת Obsidian Flavored Markdown
- [[cc-skill-obsidian-bases]] — בניית קבצי ‎.base‎ (תצוגות דמויות-DB)

### סקילים — פיתוח (Superpowers)
- [[cc-skill-brainstorming]] — הפיכת רעיון לעיצוב ול-spec לפני מימוש
- [[cc-skill-writing-plans]] — כתיבת תוכנית מימוש מתוך spec
- [[cc-skill-executing-plans]] — ביצוע תוכנית בסשן נפרד עם checkpoints
- [[cc-skill-subagent-driven-development]] — ביצוע תוכנית דרך subagents עם סקירה דו-שלבית
- [[cc-skill-dispatching-parallel-agents]] — שיגור סוכנים מקבילים למשימות בלתי-תלויות
- [[cc-skill-test-driven-development]] — פיתוח מונחה-בדיקות (TDD)
- [[cc-skill-systematic-debugging]] — דיבוג שיטתי ואיתור שורש הבעיה
- [[cc-skill-verification-before-completion]] — אימות מבוסס-ראיות לפני הצהרת השלמה
- [[cc-skill-requesting-code-review]] — בקשת סקירת קוד דרך subagent סוקר
- [[cc-skill-receiving-code-review]] — קבלת משוב סקירה וטיפול ביקורתי בו
- [[cc-skill-finishing-a-development-branch]] — סגירת ענף פיתוח (merge/PR/ניקוי)
- [[cc-skill-using-git-worktrees]] — בידוד סביבת עבודה עם git worktrees
- [[cc-skill-using-superpowers]] — מטא: כיצד מגלים ומשתמשים בסקילים
- [[cc-skill-writing-skills]] — יצירה, עריכה ואימות של סקילים
- [[cc-skill-karpathy-guidelines]] — הנחיות התנהגות לצמצום טעויות קוד של LLM
