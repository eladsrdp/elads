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
    /**
     * דיווחי שעות (קריאה ו-POST). יוצרים ב-collection השטוח עם DOCNO בגוף —
     * המבנה המאומת שעובד (מתועד מתרחיש Make של המשתמש + נבדק חי).
     */
    timeEntries: 'ZRDP_TRANSORDER_q',
    /** לקוחות — שורש לרשימת האתרים (CUSTDESTS_SUBFORM) */
    customers: 'CUSTOMERS',
    /** משימות לקוח / יומן לקוח (Customer Notes) */
    custNotes: 'CUSTNOTESA',
  },
  /** תת-טופס אתרי הלקוח (אתרים/יעדים) — CUSTOMERS(CUSTNAME)/<subform> */
  customerSitesSubform: 'CUSTDESTS_SUBFORM',
  /** שדות אתר ב-CUSTDESTS: CODE = הערך שנשלח כ-DCODE, CODEDES = תאור */
  siteFields: { code: 'CODE', name: 'CODEDES' },
  /**
   * מק"ט השירות (PARTNAME) שכל שורת דיווח שעות חייבת לשאת.
   * ב-rdp כל הדיווחים משתמשים ב"ש'ע" (שעת עבודה). שדה חובה — בלעדיו: "חסר מק"ט".
   */
  serviceItem: "ש'ע",
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
    partName: 'PARTNAME',  // מק"ט השירות — שדה חובה בשורת דיווח
    dcode: 'DCODE',        // אתר/יעד — נדרש בחלק מהלקוחות
    ref: 'TRANS',
    ordName: 'ORDNAME',  // מספר הזמנה — נדרש בחלק מהלקוחות (פיק, שחר וכו')
    ordLine: 'OLINE',    // שורת ההזמנה
    billable: 'FLAG',    // לחיוב: "Y" = כן, null = לא
    custnote: 'CUSTNOTE', // FK למשימת הלקוח (CUSTNOTESA.CUSTNOTE, Int64) — אופציונלי
  },
  custNoteFields: {
    id: 'CUSTNOTE',        // מפתח ראשי (Int64)
    subject: 'SUBJECT',    // כותרת המשימה (עד 52 תווים)
    custName: 'CUSTNAME',  // קוד הלקוח
    custDes: 'CUSTDES',    // שם הלקוח
    statDes: 'STATDES',    // סטטוס
    closed: 'CLOSED',      // "Y" = סגורה, "N" = פתוחה
    tillDate: 'TILLDATE',  // תאריך יעד
    userLogin: 'USERLOGIN', // בעל המשימה (יוצר) — נשלח רק ביצירה
    projDocNo: 'PROJDOCNO', // מזהה הפרויקט המקושר
    hours: 'ZRDP_HOURS',   // שעות שדווחו
    priority: 'PRIO',      // עדיפות (0-99)
    owner: 'ZRDP_TASKOWNER', // "אחראי משימה" — לצפייה בלבד
    // "לטיפול" — מאושר בסקריפט הגילוי (Task 1, 2026-08-17): הודעת שגיאה של פריוריטי
    // עצמה קראה לעמודה הזו "לטיפול". הערך חייב להיות login עובד אמיתי (למשל 'elads'),
    // לא משתמש ה-API של האינטגרציה.
    handler: 'USERLOGIN',
  },
  // תת-טופס תיאור מורחב ("עדכון פנימי") — ContainsTarget יחיד, שדה TEXT.
  // היסטוריה: CUSTNOTESTEXT_ONE_SUBFORM שגוי (property not found, Task 1 2026-08-17).
  // CUSTNOTESTEXT_SUBFORM (השם שתוקן אז) התברר read-only בפועל בפריוריטי — הודעת
  // השרת: "מסך טקסט CUSTNOTESTEXT הינו לקריאה בלבד ולא ניתן לעדכון" (אומת חי 2026-08-18).
  // המועמד שכן עובד, אומת חי 2026-08-19: INTERNALDIALOGTEXT_SUBFORM — אותו מבנה שדות
  // (TEXT/APPEND/SIGNATURE), אבל ניתן לכתיבה (POST החזיר 201, גם על משימה "מבוטלת").
  // סמנטיקה מאומתת: **דריסה (overwrite), לא הוספה (append)** — POST שני דרס את הראשון
  // לגמרי (רק הטקסט האחרון הופיע ב-GET לאחר מכן). פריוריטי גם עוטפת את הטקסט
  // אוטומטית ב-HTML/CSS (<style>...</style><p dir=rtl>...) — יש להסיר את זה בקריאה
  // (ראה stripInternalDialogHtml ב-odata.ts) לפני הצגה למשתמש.
  custNoteTextSubform: 'INTERNALDIALOGTEXT_SUBFORM',
  custNoteTextFields: { text: 'TEXT' },
  /** תת-טופס לוג הסטטוסים ("לוג סטטוסים") — כל השדות read-only בפריוריטי. */
  custNoteLogSubform: 'DOCTODOLISTLOG_SUBFORM',
  custNoteLogFields: { date: 'UDATE', status: 'STATDES', handler: 'OWNERLOGIN', initiator: 'INITIATORLOGIN' },
  /** TQUANT הוא שעות עשרוניות (1.75 = שעה ושלושת-רבעי) */
  hoursAsDecimal: true,
  /** PDES מוגבל ל-60 תווים בפריוריטי */
  noteMaxLength: 60,
  /**
   * רק פרויקטים בסטטוסים האלה (STATDES) מוצגים לבחירה.
   * "מבוטלת" / "סופית" מסוננים — אי אפשר לדווח עליהם.
   */
  activeStatuses: ['טיוטא'] as readonly string[],
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
