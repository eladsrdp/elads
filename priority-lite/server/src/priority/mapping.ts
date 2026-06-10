// כל שמות הישויות והשדות של Priority במקום אחד.
// מופה מתוך $metadata ודוגמאות אמיתיות ב-2026-06-10 (חברת rdpltd).
// שום קוד מחוץ לקובץ הזה ול-odata.ts לא מכיר שמות של פריוריטי.
//
// המודל בפועל אצל rdp:
//   "משימה" באפליקציה = פרויקט בפריוריטי (ZRDP_DOCUMENTS_p):
//     DOCNO (למשל PR26000029) + PROJDES (שם) + CUSTDES (לקוח) + STATDES (סטטוס)
//   דיווח שעות = שורה ב-ZRDP_TRANSORDER_q:
//     USERLOGIN (עובד) + CURDATE (תאריך) + DOCNO (פרויקט) +
//     TQUANT (שעות עשרוניות) + PDES (תיאור חופשי, עד 60 תווים) + TRANS (מס' דיווח, auto)

export const priorityMapping = {
  entities: {
    /** "משימות" באפליקציה = פרויקטים (תיקי פרויקט פעילים) */
    tasks: 'ZRDP_DOCUMENTS_p',
    /** דיווחי שעות עבודה */
    timeEntries: 'ZRDP_TRANSORDER_q',
  },
  taskFields: {
    id: 'DOCNO',
    name: 'PROJDES',
    projectId: 'CUSTNAME',
    projectName: 'CUSTDES',
    status: 'STATDES',
    description: 'DETAILS',
  },
  timeFields: {
    employeeId: 'USERLOGIN',
    taskId: 'DOCNO',
    taskName: 'PROJDES',
    date: 'CURDATE',
    duration: 'TQUANT',
    startTime: 'STIME',
    endTime: 'ETIME',
    note: 'PDES',
    ref: 'TRANS',
  },
  /** TQUANT הוא שעות עשרוניות (1.75 = שעה ושלושת-רבעי) */
  hoursAsDecimal: true,
  /** PDES מוגבל ל-60 תווים בפריוריטי */
  noteMaxLength: 60,
} as const

/** זורק שגיאה ברורה אם נשארו placeholders — מופעל רק במצב real. */
export function assertMappingComplete(): void {
  const todos: string[] = []
  const walk = (obj: Record<string, unknown>, path: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.startsWith('TODO_')) todos.push(`${path}${k}`)
      else if (typeof v === 'object' && v !== null) walk(v as Record<string, unknown>, `${path}${k}.`)
    }
  }
  walk(priorityMapping, '')
  if (todos.length > 0) {
    throw new Error(
      `mapping.ts לא הושלם — חסרים שמות אמיתיים מפריוריטי עבור: ${todos.join(', ')}. ` +
        'מלא את priority/mapping.ts לפי שמות הישויות והשדות במערכת שלכם.',
    )
  }
}
