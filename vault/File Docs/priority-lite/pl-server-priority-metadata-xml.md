# priority-lite/server/priority-metadata.xml

**שייך ל:** priority-lite / שרת / אינטגרציית Priority

## מה הקובץ עושה
ה-$metadata המלא של שירות ה-OData של פריוריטי (חברת rdpltd) — קובץ XML ענק (כ-מאות MB טקסט) שנשמר חד-פעמית על ידי `scripts/discover.ts metadata`. שימש למיפוי שמות הישויות והשדות האמיתיים (כמו ZRDP_DOCUMENTS_p ו-ZRDP_TRANSORDER_q) לתוך mapping.ts. קובץ עזר לעיון בלבד — שום קוד לא קורא אותו בזמן ריצה.

## קבצים קשורים
- [[pl-server-scripts-discover]] — הסקריפט שיצר את הקובץ
- [[pl-server-priority-mapping]] — המיפוי שנגזר מהקובץ הזה
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
