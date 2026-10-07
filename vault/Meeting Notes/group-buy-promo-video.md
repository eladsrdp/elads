# Group-buy promo video (ארץ-קיר)

## Overview
סרטון פרומו של 90 שניות (16:9) למערכת האוטומציה של קבוצות הרכישה של ארץ-קיר (ManyChat + Make), נבנה ב-HyperFrames כמושן-גרפיקס מלא. הפרויקט ב-`videos/group-buy-promo/`: הבריף, הסטוריבורד (9 סצנות), `index.html` והקריינות. בהמשך מתוכננת גזירה אנכית של 30 שנ' (9:16).

## Open Questions
- מפתח ה-OpenAI ב-.env לא תקף (401). הקריינות לא נוצרה, והתזמון עדיין לפי הערכה.
- 26 אוטומציות (בבריף) או 35 (ב-ManyChat)? צריך להחליט על כיתוב 9.
- האם לשלב רגעים מהסיכום (כפתור "אספתי!", 160 במקום 229, 14,245 אנשי קשר) בויזואל ובקריינות?
- מוזיקה ו-SFX עדיין לא נבחרו.

## Session Log

### 2026-10-06 — Install HyperFrames + first build [wip]
- **What was done:** נבדקו והותקנו סקילי HeyGen HyperFrames, והטלמטריה כובתה. הותקן FFmpeg. נבנו 9 הסצנות ב-`index.html`, ו-`hyperframes check` עבר.
- **Decisions:** הבריף נכתב לצילום חי, ולכן הכול תורגם למושן-גרפיקס (החלטת המשתמש). קריינות ב-OpenAI TTS.
- **Notes / Caveats:** ה-TTS נכשל עם 401, כי המפתח לא תקף.
- **Related:** [[project-overview]], [[env-config]]

### 2026-10-07 — Product photo + ManyChat context [wip]
- **What was done:** תמונת המוצר שולבה בסצנה 7 (המפה יוצאת מהחבילה) ובכרטיס הסיום. סיכום ה-ManyChat נשמר בפרויקט.
- **Decisions:** הקריינות והכיתובים לא שונו בלי אישור המשתמש.
- **Related:** [[project-overview]]
