// ===== Core domain types =====

/** מזהה כיס: עסקי או ביתי */
export type ScopeId = 'business' | 'home'

/** סטטוס תנועה: כבר בוצעה בפועל, או צפויה לקרות */
export type TxStatus = 'actual' | 'forecast'

/** מקור הרשומה */
export type TxSource = 'manual' | 'import' | 'recurring' | 'transfer'

/** כיס — עסקי או ביתי. שני רשומות קבועות במערכת. */
export interface Scope {
  id: ScopeId
  name: string
  /** סף חריגה (מסגרת אשראי). ההתרעה נדלקת כשהיתרה החזויה < -creditLimit. ברירת מחדל 0. */
  creditLimit: number
  /** יתרה נוכחית מעודכנת (נקודת ההתחלה לחישוב התחזית). */
  currentBalance: number
}

/** תנועה בודדת — הכנסה (amount חיובי) או הוצאה (amount שלילי). */
export interface Transaction {
  id?: number
  scopeId: ScopeId
  /** סכום בש"ח. חיובי = הכנסה, שלילי = הוצאה. */
  amount: number
  /** תאריך התנועה בפורמט ISO (YYYY-MM-DD). */
  date: string
  description: string
  status: TxStatus
  source: TxSource
  /** קישור להגדרת הקבוע שיצרה את התנועה (אם source === 'recurring'). */
  recurringId?: number
  /** קישור להעברה שיצרה את התנועה (אם source === 'transfer'). */
  transferId?: number
}

/** הגדרת הוצאה/הכנסה קבועה. המערכת מייצרת ממנה תנועות forecast חודשיות. */
export interface Recurring {
  id?: number
  scopeId: ScopeId
  amount: number
  /** יום בחודש (1–31) שבו התנועה מתרחשת. */
  dayOfMonth: number
  description: string
}

/** העברה בין כיסים. יוצרת זוג תנועות forecast מקושרות. */
export interface Transfer {
  id?: number
  amount: number
  dayOfMonth: number
  fromScope: ScopeId
  toScope: ScopeId
  description: string
}

// ===== Forecast engine output types =====

/** סטטוס בריאות תזרים בנקודת זמן. */
export type PulseStatus = 'safe' | 'danger'

/** נקודה יומית בתחזית. */
export interface ForecastPoint {
  /** תאריך ISO (YYYY-MM-DD). */
  date: string
  /** היתרה החזויה בסוף אותו יום. */
  balance: number
  status: PulseStatus
}

/** תוצאת מנוע התחזית עבור כיס בודד עד יום היעד. */
export interface ForecastResult {
  points: ForecastPoint[]
  /** היתרה החזויה ביום היעד (ה-10). */
  targetBalance: number
  /** הסטטוס הכולל — danger אם בכל נקודה הייתה חריגה. */
  status: PulseStatus
  /** כמה כסף חסר כדי לעבור את היעד בבטחה (0 אם בטוח). */
  shortfall: number
  /** כמה ימים נותרו עד יום היעד (כולל). */
  daysRemaining: number
  /** התאריך של יום היעד (ISO). */
  targetDate: string
}
