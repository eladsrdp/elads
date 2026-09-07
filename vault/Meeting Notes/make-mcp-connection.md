# Make.com MCP Connection

## Overview
חיבור MCP (Model Context Protocol) בין Claude Code (סביבת "חמשת הסוכנים") לבין Make.com, כדי שראובן/הסוכנים יוכלו לגשת ישירות ל-Make (לדוגמה: לראות/להריץ סנריואים, לשלוף מידע על ה-workspace) בלי לעבור דרך webhook ייעודי כמו ב-[[make-issues-dashboard]]. החיבור מוגדר ברמת הפרויקט ב-`.mcp.json` (transport `http`, endpoint `https://mcp.make.com`) ומאומת מול Make דרך OAuth בדפדפן (לא טוקן שנשמר ב-`.env`) — Make עצמם מריצים ומארחים את שרת ה-MCP.

## Open Questions
- **אישור OAuth טרם בוצע בפועל** — המשתמש צריך להריץ סשן `claude` אינטראקטיבי בטרמינל (לא בפאנל הזה, ששולל פקודות slash כמו `/mcp`), ואז `/mcp` כדי להתחיל את זרימת האישור בדפדפן ולבחור org/scopes ב-Make.
- **טרם הוחלט אילו סוכנים בצוות אמורים להשתמש בכלי הזה** — כרגע זו תוספת ברמת הפרויקט (זמינה לכל סשן), לא שויכה לסוכן ספציפי (חן/יעל/יובל/נועה) בהוראות הניתוב ב-CLAUDE.md.
- אם מתעוררת בעיית חיבור — לנסות endpoint חלופי: `https://mcp.make.com/stateless` או `.../stream`.

## Session Log

### 2026-09-07 — הוספת .mcp.json לחיבור MCP מול Make.com [wip]
- **What was done:** המשתמש ביקש "לדבר עם MAKE דרך MCP". אומת מול מסמכי Make Developer Hub (חיפוש+fetch) שהחיבור הרשמי מ-Claude Code הוא `claude mcp add --transport http make https://mcp.make.com` עם אימות OAuth (לא API key). נוצר `.mcp.json` בשורש הריפו עם ההגדרה הזו ברמת הפרויקט.
- **Decisions:** נבחר חיבור OAuth הרשמי של Make (מתועד ב-developers.make.com) על פני אינטגרציית צד-שלישי (Composio) שעלתה גם היא בחיפוש — כי הוא native, לא דורש מפתח נוסף לנהל, ותואם למדיניות "אין סודות בקוד" של הפרויקט.
- **Notes / Caveats:** לא בוצעה עדיין השלמת ה-OAuth בפועל (דורשת טרמינל אינטראקטיבי + דפדפן, לא זמין מהפאנל הנוכחי). אין טוקן/סוד לשמור ב-`.env` עבור החיבור הזה.
- **Related:** [[make-issues-dashboard]], [[env-config]], [[project-overview]]
