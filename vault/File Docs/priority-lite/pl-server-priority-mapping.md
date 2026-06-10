# priority-lite/server/src/priority/mapping.ts

**שייך ל:** priority-lite / שרת / אינטגרציית Priority

## מה הקובץ עושה
ריכוז כל שמות הישויות והשדות של Priority במקום אחד — שום קוד מחוץ לקובץ הזה ול-odata.ts לא מכיר שמות פריוריטי. ממופה מתוך ה-$metadata ודוגמאות אמיתיות של חברת rdpltd: "משימה" באפליקציה = פרויקט בפריוריטי (ZRDP_DOCUMENTS_p עם DOCNO/PROJDES/CUSTDES), ודיווח שעות = שורה ב-ZRDP_TRANSORDER_q ‏(USERLOGIN/CURDATE/TQUANT וכו'). כולל גם כללי המרה (TQUANT בשעות עשרוניות, PDES מוגבל ל-60 תווים) ו-`assertMappingComplete` שזורק שגיאה ברורה במצב real אם נשארו placeholders מסוג TODO_.

## קבצים קשורים
- [[pl-server-priority-odata]] — הצרכן היחיד של המיפוי
- [[pl-server-priority-metadata-xml]] — המקור שממנו מופו השמות
- [[pl-server-scripts-discover]] — הסקריפט ששימש לגילוי
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
