# הגירת ה-repo ל-GitHub ‏(eladsrdp/elads) ונהלי עבודה אוטומטיים

## Overview
ה-repo של הפרויקט עבר מ-`elad-stack/the_five_agents` ל-repo הרשמי של הפרויקט: `https://github.com/eladsrdp/elads` (origin). נקבעו שני נהלי עבודה קבועים שמתועדים ב-CLAUDE.md: ‏(1) הפעלת הסקיל `obsidian-vault-workflow` בכל סשן ובכל פקודה (ה-hook ב-`.claude/settings.json` הוגדר לירות בכל prompt), ‏(2) קומיט + push אוטומטיים ל-origin בסיום כל משימה, אחרי סריקת סודות/PII. בנוסף נוצרה מערכת תיעוד פר-קובץ ב-`vault/File Docs/` (כ-160 קבצי MD בארבעה אזורים: pl-/cf-/cc-/ws-).

## Open Questions
- none

## Session Log

### 2026-06-10 — חיבור ל-repo החדש, תיעוד מלא, ונהלים אוטומטיים [shipped]
- **What was done:** origin הוחלף ל-`eladsrdp/elads`. סריקת סודות לפני העלאה: ‏.env (root + server), whitelist.json ו-data/ מוחרגים כראוי ב-gitignore. זוהה שה-repo public והוצגו למשתמש שלוש אפשרויות — בחר להפוך אותו ל-private ולדחוף הכל. הוסר `"once": true` מה-hook כך שתזכורת ה-vault נטענת בכל פקודה. נוסף ל-CLAUDE.md פרק "כללי עבודה קבועים" (vault בכל משימה; קומיט+push אוטומטי עם סריקת סודות). 4 סוכנים מקבילים יצרו תיעוד MD לכל קובץ בפרויקט תחת `vault/File Docs/` עם אינדקסים.
- **Decisions:** קומיט אוטומטי מומש כהוראה ב-CLAUDE.md (ולא כ-hook) כדי שסריקת הסודות תקדים כל דחיפה. Superpowers לא הותקן מחדש — כבר מותקן (v5.1.0, קומיט 5a4cb01) והסקילים פעילים.
- **Notes / Caveats:** ‏cashflow-pulse: ה-README עדיין תבנית Vite גנרית ויש שרידי תבנית לא בשימוש (App.css, assets) — עלה מתיעוד הסוכנים. ‏Output/ מוחרג מ-git (לפי gitignore קיים) ולכן תוצרים סופיים לא נדחפים.
- **Related:** [[project-overview]], [[priority-lite-app]], [[cashflow-pulse-app]], [[skills-obsidian]], [[env-config]]
