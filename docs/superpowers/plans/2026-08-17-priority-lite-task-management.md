# ניהול משימות (CUSTNOTESA) — Phase 1 — תוכנית מימוש

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** להוסיף ל-priority-lite ניהול משימות מלא (CUSTNOTESA) — יצירה, מסך פרטי משימה, עדכון (סטטוס/עדיפות/תיאור), העברה בין אנשי צוות, חיפוש גלובלי, "המשימות שלי", והיסטוריית סטטוס — הכל מסונכרן עם Priority.

**Architecture:** הרחבת השכבות הקיימות (adapter → actions → routes → client hooks → screens), לא ארכיטקטורה מקבילה. Namespace API חדש `/api/custnotes` + `/api/employees` לצד הקיים. שלושה שדות/סמנטיקות בפריוריטי טרם מאומתים חי — Task 1 הוא סקריפט גילוי שחייב לרוץ ולהיסגר לפני שממשיכים ל-Task 8 (odata.ts האמיתי).

**Tech Stack:** Hono, zod, Priority OData v4, React 19, Dexie (לא נדרש כאן — קריאה ישירה מהשרת, כמו TaskPicker הקיים), Vitest.

**מסמך העיצוב המלא:** `docs/superpowers/specs/2026-08-17-priority-lite-task-management-design.md`

---

## Task 1: סקריפט גילוי — אימות 3 הסיכונים הטכניים מול פריוריטי אמיתי [בוצע — ראה ממצאים]

**עודכן 2026-08-17 — המשימה בוצעה בפועל (על ידי הבקר, לא subagent, בגלל כתיבה חיה לפריוריטי אמיתי). ממצאים:**

1. **כתיבת סטטוס (`STATDES`) — עובדת.** `PATCH CUSTNOTESA(CUSTNOTE=...)` עם `{STATDES:'לפיתוח'}` → `200`, אומת בקריאה חוזרת.
2. **"לטיפול" = `USERLOGIN` — מאושר.** ניסיון כתיבה עם ערך לא-תקין (משתמש ה-API) נכשל, אבל הודעת השגיאה של פריוריטי עצמה קראה לעמודה בשמה העסקי: *"לטיפול EE0997...: ערך ... לא קיים בעמודה 'לטיפול' בטבלת 'משתמשי מערכת'"* — כלומר `USERLOGIN` הוא אכן "לטיפול", אבל **חייב להיות login עובד אמיתי** (כמו `elads`), לא משתמש ה-API של האינטגרציה.
3. **תת-טופס התיאור — שם שגוי בתוכנית המקורית, תוקן.** `CUSTNOTESTEXT_ONE_SUBFORM` **לא קיים** על `CUSTNOTESA` (שגיאת "property not found" חיה). השם הנכון, מאומת מול ה-`<EntityType Name="CUSTNOTESA">` במטא-דאטה: **`CUSTNOTESTEXT_SUBFORM`** (מצביע לישות `CUSTNOTESTEXT`, אותו מבנה שדות `TEXT`/`APPEND`/`SIGNATURE`). **סמנטיקת append-מול-דריסה נותרה לא מאומתת חי** — פריוריטי הפכה ללא-יציבה (404/401 חוזרים) לפני שהספקתי להשלים את הסבב הזה; ראו הערה ב-Task 8 לבדיקה ממוקדת וקטנה יותר בהמשך.

התוכנית המקורית של ה-task הזה (סקריפט מלא, הרצה, ותיעוד) נשארת למטה כתיעוד של איך הגענו לממצאים — **אין צורך להריץ אותה שוב**, המידע הדרוש כבר מוזן ל-Task 2 ואילך.

<details>
<summary>התוכנית המקורית של Task 1 (כבר בוצעה — לצורך תיעוד בלבד)</summary>

לפני שכותבים שורת קוד ב-`odata.ts`, חייבים לדעת: (א) האם כתיבה ישירה ל-`STATDES` עובדת; (ב) האם `USERLOGIN` הוא באמת "לטיפול"; (ג) האם POST ל-`CUSTNOTESTEXT_ONE_SUBFORM` מוסיף רשומה או דורס, ומהי תחביר הכתובת המדויק לתת-טפסים הממוענים לפי מפתח (`CUSTNOTESA(CUSTNOTE=...)/...`). המשתמש אישר יצירת משימת בדיקה חיה לצורך זה (2026-08-17).

**Files:**
- Create: `priority-lite/server/scripts/discover-custnote-fields.ts`

- [ ] **Step 1: כתיבת הסקריפט**

```ts
// priority-lite/server/scripts/discover-custnote-fields.ts
// סקריפט גילוי חד-פעמי: יוצר משימת CUSTNOTESA אמיתית על פרויקט פנימי בטוח,
// מנסה לכתוב סטטוס/לטיפול/תיאור, קורא בחזרה, ומדווח מה עבד — ואז מנקה.
//   npx tsx scripts/discover-custnote-fields.ts
import 'dotenv/config'

const base = process.env.PRIORITY_BASE_URL ?? ''
const ini = process.env.PRIORITY_TABULA_INI ?? 'tabula.ini'
const company = process.env.PRIORITY_COMPANY ?? ''
const user = process.env.PRIORITY_USER ?? ''
const password = process.env.PRIORITY_PASSWORD ?? ''

// פרויקט פנימי RDP — נעשה בו שימוש בעבר לבדיקות דיווח שעות בטוחות (ראה vault priority-lite-app, session 2026-06-11)
const TEST_PROJECT = 'PR23000014'

if (!base || !company || !user || !password) {
  console.error('חסרים ערכים ב-.env (PRIORITY_BASE_URL/COMPANY/USER/PASSWORD)')
  process.exit(1)
}

const root = `${base.replace(/\/$/, '')}/odata/Priority/${ini}/${company}`
const auth = 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')

async function call(path: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${root}/${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init?.headers,
    },
  })
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // לא JSON — נשאיר כטקסט
  }
  return { status: res.status, body }
}

async function main() {
  console.log('=== שלב 1: יצירת משימת בדיקה ===')
  const created = await call('CUSTNOTESA', {
    method: 'POST',
    body: JSON.stringify({
      SUBJECT: 'בדיקת גילוי שדות — נא להתעלם ולמחוק',
      CUSTNAME: TEST_PROJECT,
    }),
  })
  console.log('POST CUSTNOTESA →', created.status)
  console.log(JSON.stringify(created.body, null, 2).slice(0, 1000))
  if (created.status < 200 || created.status >= 300) {
    console.error('יצירה נכשלה — עוצר כאן')
    process.exit(1)
  }
  const row = created.body as Record<string, unknown>
  const custnote = row.CUSTNOTE
  console.log(`נוצרה משימה CUSTNOTE=${custnote}`)

  console.log('\n=== שלב 2: כתיבת סטטוס ישירות ל-STATDES ===')
  const statusWrite = await call(`CUSTNOTESA(CUSTNOTE=${custnote})`, {
    method: 'PATCH',
    body: JSON.stringify({ STATDES: 'לפיתוח' }),
  })
  console.log('PATCH STATDES →', statusWrite.status, JSON.stringify(statusWrite.body).slice(0, 500))

  console.log('\n=== שלב 3: כתיבת USERLOGIN (מועמד ל"לטיפול") ===')
  const handlerWrite = await call(`CUSTNOTESA(CUSTNOTE=${custnote})`, {
    method: 'PATCH',
    body: JSON.stringify({ USERLOGIN: user }),
  })
  console.log('PATCH USERLOGIN →', handlerWrite.status, JSON.stringify(handlerWrite.body).slice(0, 500))

  console.log('\n=== שלב 4: קריאה חזרה — לוודא שהכתיבות אכן נשמרו ===')
  const readBack = await call(
    `CUSTNOTESA?$select=CUSTNOTE,STATDES,USERLOGIN,ZRDP_TASKOWNER,PRIO&$filter=CUSTNOTE eq ${custnote}`,
  )
  console.log('GET readback →', readBack.status, JSON.stringify(readBack.body, null, 2).slice(0, 1000))

  console.log('\n=== שלב 5: POST לתת-טופס התיאור (CUSTNOTESTEXT_ONE_SUBFORM) — פעם ראשונה ===')
  const text1 = await call(`CUSTNOTESA(CUSTNOTE=${custnote})/CUSTNOTESTEXT_ONE_SUBFORM`, {
    method: 'POST',
    body: JSON.stringify({ TEXT: 'עדכון בדיקה מספר 1' }),
  })
  console.log('POST text#1 →', text1.status, JSON.stringify(text1.body).slice(0, 500))

  console.log('\n=== שלב 6: POST שני לאותו תת-טופס — לבדוק append מול דריסה ===')
  const text2 = await call(`CUSTNOTESA(CUSTNOTE=${custnote})/CUSTNOTESTEXT_ONE_SUBFORM`, {
    method: 'POST',
    body: JSON.stringify({ TEXT: 'עדכון בדיקה מספר 2' }),
  })
  console.log('POST text#2 →', text2.status, JSON.stringify(text2.body).slice(0, 500))

  console.log('\n=== שלב 7: קריאת התיאור בחזרה — לבדוק אם 2 נמצא לצד 1 או דרס אותו ===')
  const textReadback = await call(`CUSTNOTESA(CUSTNOTE=${custnote})/CUSTNOTESTEXT_ONE_SUBFORM`)
  console.log('GET text readback →', textReadback.status, JSON.stringify(textReadback.body, null, 2).slice(0, 1500))

  console.log('\n=== שלב 8: קריאת לוג הסטטוסים (DOCTODOLISTLOG_SUBFORM) ===')
  const logReadback = await call(
    `CUSTNOTESA(CUSTNOTE=${custnote})/DOCTODOLISTLOG_SUBFORM?$select=UDATE,STATDES,OWNERLOGIN,INITIATORLOGIN`,
  )
  console.log('GET log →', logReadback.status, JSON.stringify(logReadback.body, null, 2).slice(0, 1500))

  console.log('\n=== שלב 9: ניקוי — סגירת משימת הבדיקה ===')
  const cleanup = await call(`CUSTNOTESA(CUSTNOTE=${custnote})`, {
    method: 'PATCH',
    body: JSON.stringify({ STATDES: 'מבוטלת', CLOSED: 'Y' }),
  })
  console.log('PATCH cleanup →', cleanup.status, JSON.stringify(cleanup.body).slice(0, 500))

  console.log('\n=== סיכום — מלא ידנית לפי הפלט למעלה לפני Task 3 ===')
  console.log('1. כתיבת STATDES עבדה?', statusWrite.status >= 200 && statusWrite.status < 300 ? 'כן' : 'לא — ראה שגיאה')
  console.log('2. כתיבת USERLOGIN עבדה?', handlerWrite.status >= 200 && handlerWrite.status < 300 ? 'כן' : 'לא — ראה שגיאה')
  console.log('3. התיאור: append או דריסה? — בדוק בפלט שלב 7 אם שתי ההודעות מופיעות')
}

main()
```

- [ ] **Step 2: הרצה ותיעוד התוצאה**

הרצה:
```bash
cd priority-lite/server
npx tsx scripts/discover-custnote-fields.ts
```

לפני ההרצה — ודא ש-`.env` מכיל `PRIORITY_MODE=real` עם קרדנציאלים אמיתיים (כפי שכבר מוגדר בפרודקשן). קרא את כל הפלט בעיון וסמן:

- אם `STATDES` **לא** נכתב ישירות (שגיאה כמו "אין לשנות תאור" וכו') — יש למצוא נתיב חלופי (ייתכן שדה קוד נסתר) לפני Task 3. עדכן את `mapping.ts` (Task 3) בהתאם למה שהתגלה.
- אם `USERLOGIN` **לא** מתפקד כ"לטיפול" (למשל: לא השתנה, או שהוא בעצם "יוצר" קבוע) — צריך למצוא שדה חלופי (מועמדים נוספים מהמטא-דאטה: `ZRDP_DEVUSERLOGIN`, `USERLOGIN2`) ולעדכן את `mapping.ts` בהתאם.
- אם התיאור **דורס** ולא מוסיף (הודעה #1 נעלמת אחרי POST #2) — יש לשקול קריאה+שרשור טקסט קיים לפני POST, ולתעד זאת ב-`odata.ts` (Task 8).

- [ ] **Step 3: מחיקת הסקריפט (חד-פעמי, לא נשאר ב-repo)**

```bash
rm priority-lite/server/scripts/discover-custnote-fields.ts
```

- [ ] **Step 4: Commit**

אין קוד קבוע לשמור מה-task הזה (הסקריפט נמחק) — הממצאים מוזנים ישירות ל-Task 3 ו-Task 8. אין commit נפרד; ה-commit הראשון בפועל יהיה בסוף Task 2.

</details>

---

## Task 2: טיפוסים משותפים (`shared/src/types.ts`)

**Files:**
- Modify: `priority-lite/shared/src/types.ts`

- [ ] **Step 1: הוספת הטיפוסים החדשים**

הוסף בסוף הקובץ (אחרי `RemoteTimeEntry`):

```ts
/** תת-קבוצת הסטטוסים הנבחרת לשימוש יומיומי (מתוך ~12 שקיימים בפריוריטי). */
export const TASK_STATUSES = ['טיוטא', 'לפיתוח', 'לבדיקת פיתוח', 'בוצעה', 'מבוטלת', 'במעקב'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/** רשומת היסטוריה אחת מ-DOCTODOLISTLOG (לוג סטטוסים, read-only בפריוריטי). */
export interface TaskStatusLogEntry {
  date: string
  status: string
  handlerName?: string
  initiatorName?: string
}

/** שינויים אפשריים במשימה — כל שדה אופציונלי, נשלחים רק אלה שהשתנו. */
export interface UpdateCustNoteInput {
  status?: TaskStatus
  priority?: number // PRIO, 0-99
  tillDate?: string // YYYY-MM-DD
  handlerEmpId?: string // "לטיפול"
  description?: string // תוספת חדשה לתיאור, לא עריכת קיים
}

/** עובד לבורר "לטיפול" — רק מה שדרוש, בלי טלפון/totp. */
export interface EmployeeSummary {
  priorityEmpId: string
  name: string
}

/** אפשרויות סינון לחיפוש משימות גלובלי. */
export interface SearchCustNotesOptions {
  handlerEmpId?: string
  status?: TaskStatus[]
}
```

עדכן את הממשק `CustNote` הקיים כך שיכלול שדות אופציונליים חדשים (רק מוסיפים, לא משנים קיימים):

```ts
/** משימת לקוח (CUSTNOTESA) — רשומת יומן/משימה בפריוריטי. מזהה = CUSTNOTE (Int64). */
export interface CustNote {
  id: number         // CUSTNOTE
  subject: string    // SUBJECT — כותרת המשימה (עד 52 תווים)
  custName: string   // CUSTNAME — קוד הלקוח
  custDes: string    // CUSTDES — שם הלקוח
  statDes?: string   // STATDES — סטטוס
  tillDate?: string  // TILLDATE — תאריך יעד (YYYY-MM-DD)
  projDocNo?: string // PROJDOCNO — פרויקט מקושר
  hoursReported?: number // ZRDP_HOURS
  priority?: number      // PRIO (0-99)
  description?: string   // CUSTNOTESTEXT_ONE.TEXT — התוספת האחרונה
  ownerName?: string     // ZRDP_TASKOWNER ("אחראי משימה") — לצפייה בלבד
  handlerEmpId?: string  // "לטיפול"
  handlerName?: string
  history?: TaskStatusLogEntry[] // מ-DOCTODOLISTLOG — רק ב-getCustNoteDetail
}
```

(מחליף את הבלוק הקיים של `CustNote` — שים לב שרק שדות חדשים אופציונליים נוספו, שום שדה קיים לא השתנה, כך שכל שימוש קיים ב-`CustNote` ברחבי הקוד ממשיך לעבוד ללא שינוי.)

- [ ] **Step 2: טייפצ'ק**

```bash
cd priority-lite
npx tsc -p shared --noEmit
```
צפוי: ללא שגיאות.

- [ ] **Step 3: Commit**

```bash
git add priority-lite/shared/src/types.ts
git commit -m "feat(priority-lite): add task-management types (TaskStatus, UpdateCustNoteInput, EmployeeSummary)"
```

---

## Task 3: מיפוי שדות פריוריטי (`mapping.ts`)

**Files:**
- Modify: `priority-lite/server/src/priority/mapping.ts`

- [ ] **Step 1: הרחבת `custNoteFields` והוספת תת-טפסים חדשים**

בתוך האובייקט `priorityMapping`, עדכן את `custNoteFields` והוסף שני מפתחות חדשים אחריו (לפני `hoursAsDecimal`):

```ts
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
  // תת-טופס תיאור מורחב ("תקציר המשימה") — ContainsTarget יחיד, שדה TEXT.
  // השם אומת חי ב-Task 1 (2026-08-17): CUSTNOTESTEXT_ONE_SUBFORM שגוי (property not found),
  // השם הנכון על CUSTNOTESA הוא CUSTNOTESTEXT_SUBFORM (מצביע ל-CUSTNOTESTEXT).
  custNoteTextSubform: 'CUSTNOTESTEXT_SUBFORM',
  custNoteTextFields: { text: 'TEXT' },
  /** תת-טופס לוג הסטטוסים ("לוג סטטוסים") — כל השדות read-only בפריוריטי. */
  custNoteLogSubform: 'DOCTODOLISTLOG_SUBFORM',
  custNoteLogFields: { date: 'UDATE', status: 'STATDES', handler: 'OWNERLOGIN', initiator: 'INITIATORLOGIN' },
```

שני הממצאים (שם השדה `handler` ושם תת-הטופס `custNoteTextSubform`) כבר מאושרים מ-Task 1 (2026-08-17) — הקוד למעלה משקף את המצב הנכון, אין צורך בבדיקה נוספת בשלב הזה.

- [ ] **Step 2: טייפצ'ק**

```bash
cd priority-lite
npx tsc -p server --noEmit
```
צפוי: ללא שגיאות (הקובץ הזה לא נצרך עדיין על ידי קוד חדש, רק מורחב).

- [ ] **Step 3: Commit**

```bash
git add priority-lite/server/src/priority/mapping.ts
git commit -m "feat(priority-lite): map PRIO/ZRDP_TASKOWNER/handler + description/log subforms"
```

---

## Task 4: הרחבת ממשק ה-Adapter (`adapter.ts`)

**Files:**
- Modify: `priority-lite/server/src/priority/adapter.ts`

- [ ] **Step 1: עדכון ה-imports וה-interface**

עדכן את שורת ה-import בראש הקובץ:

```ts
import type {
  CreateCustNoteInput,
  CreateTaskInput,
  CustNote,
  ProjectSite,
  RemoteTimeEntry,
  SearchCustNotesOptions,
  TaskDetail,
  TaskSummary,
  UpdateCustNoteInput,
} from '@priority-lite/shared'
```

הוסף שלוש מתודות לסוף הממשק `PriorityAdapter` (אחרי `createCustNote`):

```ts
  /** יצירת משימת לקוח חדשה ב-CUSTNOTESA */
  createCustNote(input: CreateCustNoteInput): Promise<CustNote>
  /** חיפוש גלובלי במשימות לקוח על פני כל החברה — לא מוגבל ללקוח אחד. */
  searchCustNotes(query: string, opts: SearchCustNotesOptions, limit?: number): Promise<CustNote[]>
  /** פרטי משימה מלאים — כולל תיאור (CUSTNOTESTEXT_ONE) והיסטוריית סטטוס (DOCTODOLISTLOG). */
  getCustNoteDetail(id: number): Promise<CustNote | null>
  /** עדכון משימה — סטטוס/עדיפות/תאריך/לטיפול/תיאור. שולח רק שדות שהוגדרו ב-changes. */
  updateCustNote(id: number, changes: UpdateCustNoteInput): Promise<CustNote>
}
```

(השורה `createCustNote(input: CreateCustNoteInput): Promise<CustNote>` כבר קיימת בקובץ — רק מוסיפים את שלוש השורות החדשות אחריה, בתוך אותו בלוק `interface PriorityAdapter { ... }`.)

- [ ] **Step 2: טייפצ'ק — צפוי לשגיאה (עדיין)**

```bash
cd priority-lite
npx tsc -p server --noEmit
```
צפוי: **שגיאות** ב-`mock.ts` וב-`odata.ts` ("Property 'searchCustNotes' is missing...") — זה תקין, אלה יתוקנו ב-Task 5 ו-Task 8.

- [ ] **Step 3: Commit**

```bash
git add priority-lite/server/src/priority/adapter.ts
git commit -m "feat(priority-lite): add searchCustNotes/getCustNoteDetail/updateCustNote to PriorityAdapter"
```

---

## Task 5: מימוש ה-Mock Adapter + נתוני בדיקה

**Files:**
- Modify: `priority-lite/server/src/priority/mock.ts`
- Test: `priority-lite/server/test/mock-custnotes.test.ts`

- [ ] **Step 1: כתיבת הבדיקות הכושלות**

```ts
// priority-lite/server/test/mock-custnotes.test.ts
// בדיקות ל-3 המתודות החדשות ב-mock adapter: חיפוש גלובלי, פרטי משימה, עדכון.
import { describe, expect, it } from 'vitest'
import { createMockAdapter } from '../src/priority/mock'

describe('searchCustNotes (mock)', () => {
  it('בלי פילטרים — מחזיר משימות מכמה לקוחות שונים', async () => {
    const adapter = createMockAdapter()
    const all = await adapter.searchCustNotes('', {})
    const distinctCustomers = new Set(all.map((n) => n.custName))
    expect(distinctCustomers.size).toBeGreaterThan(2)
  })

  it('פילטר handlerEmpId — "המשימות שלי"', async () => {
    const adapter = createMockAdapter()
    const mine = await adapter.searchCustNotes('', { handlerEmpId: '42' })
    expect(mine.length).toBeGreaterThan(0)
    for (const n of mine) expect(n.handlerEmpId).toBe('42')
  })

  it('פילטר סטטוס', async () => {
    const adapter = createMockAdapter()
    const hits = await adapter.searchCustNotes('', { status: ['בוצעה'] })
    expect(hits.length).toBeGreaterThan(0)
    for (const n of hits) expect(n.statDes).toBe('בוצעה')
  })

  it('חיפוש טקסט חופשי לפי נושא', async () => {
    const adapter = createMockAdapter()
    const hits = await adapter.searchCustNotes('גיבוי', {})
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].subject).toContain('גיבוי')
  })
})

describe('getCustNoteDetail (mock)', () => {
  it('מחזיר תיאור והיסטוריה', async () => {
    const adapter = createMockAdapter()
    const detail = await adapter.getCustNoteDetail(5001)
    expect(detail?.description).toBeTruthy()
    expect(detail?.history?.length).toBeGreaterThan(0)
  })

  it('מזהה לא קיים — מחזיר null', async () => {
    const adapter = createMockAdapter()
    expect(await adapter.getCustNoteDetail(999999)).toBeNull()
  })
})

describe('updateCustNote (mock)', () => {
  it('מעדכן סטטוס ומחזיר את הרשומה המעודכנת', async () => {
    const adapter = createMockAdapter()
    const updated = await adapter.updateCustNote(5001, { status: 'בוצעה' })
    expect(updated.statDes).toBe('בוצעה')
    const reread = await adapter.searchCustNotes('', {})
    expect(reread.find((n) => n.id === 5001)?.statDes).toBe('בוצעה')
  })

  it('מעדכן לטיפול', async () => {
    const adapter = createMockAdapter()
    const updated = await adapter.updateCustNote(5002, { handlerEmpId: '77' })
    expect(updated.handlerEmpId).toBe('77')
  })

  it('משימה לא קיימת — זורק שגיאה', async () => {
    const adapter = createMockAdapter()
    await expect(adapter.updateCustNote(999999, { status: 'בוצעה' })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: הרצה — לוודא כישלון**

```bash
cd priority-lite
npm run test -w server
```
צפוי: FAIL — `TypeError: adapter.searchCustNotes is not a function` (המתודות עוד לא קיימות ב-mock).

- [ ] **Step 3: מימוש במוק**

בראש `priority-lite/server/src/priority/mock.ts`, עדכן את שורת ה-import (רק טיפוסים שבאמת נעשה בהם שימוש מפורש בקובץ — `SearchCustNotesOptions`/`UpdateCustNoteInput` מגיעים דרך ה-`PriorityAdapter` interface בהקשר, בלי annotation מפורש):

```ts
import type { CustNote, RemoteTimeEntry, TaskDetail, TaskStatus } from '@priority-lite/shared'
```

הרחב את `MOCK_CUSTNOTES` (מחליף את הבלוק הקיים) כדי לפזר רשומות על פני כל 5 הפרויקטים, עם `handlerEmpId` לבדיקת "שלי":

```ts
const MOCK_CUSTNOTES: CustNote[] = [
  { id: 5001, subject: 'הטמעה ראשונית — הגדרת סביבה', custName: 'P-100', custDes: 'לקוח אלפא', statDes: 'לפיתוח', tillDate: '2026-07-31', projDocNo: 'P-100', hoursReported: 4, priority: 50, handlerEmpId: '42' },
  { id: 5002, subject: 'בדיקות קבלה שלב א׳', custName: 'P-100', custDes: 'לקוח אלפא', statDes: 'טיוטא', projDocNo: 'P-100', hoursReported: 0, priority: 10, handlerEmpId: '99' },
  { id: 5003, subject: 'ממשק WMS — תיקון דילוגי שורות', custName: 'P-200', custDes: 'שדרוג לוגיסטיקה', statDes: 'לפיתוח', tillDate: '2026-06-30', projDocNo: 'P-200', hoursReported: 2, priority: 70, handlerEmpId: '42' },
  { id: 5004, subject: 'הדרכת צוות כספים', custName: 'P-500', custDes: 'הדרכות', statDes: 'ממתינה לאישור', projDocNo: 'P-500', hoursReported: 0, priority: 20, handlerEmpId: '99' },
  { id: 5005, subject: 'עיצוב מסך ניהול ספקים', custName: 'P-300', custDes: 'פורטל ספקים', statDes: 'במעקב', projDocNo: 'P-300', hoursReported: 6, priority: 40, handlerEmpId: '42' },
  { id: 5006, subject: 'תיקון תקלת גיבוי לילי', custName: 'P-400', custDes: 'תחזוקה שוטפת', statDes: 'בוצעה', projDocNo: 'P-400', hoursReported: 3, priority: 5, handlerEmpId: '99' },
]
```

(שים לב: 5004 נשאר עם `'ממתינה לאישור'` — סטטוס אמיתי בפריוריטי שאינו בתת-הקבוצה הנבחרת של 6 — בכוונה, כדי לבדוק שרשומות עם סטטוס "זר" עדיין מוצגות נכון ברשימה, גם אם לא ניתנות לבחירה בבורר הסטטוס.)

הוסף את שלוש המתודות בתוך האובייקט המוחזר מ-`createMockAdapter` (אחרי `createCustNote`, לפני הסוגר הסוגר של ה-`return`):

```ts
    async searchCustNotes(query, opts, limitN = 50) {
      await simulate('חיפוש משימות')
      let rows = [...custNotes]
      if (opts.handlerEmpId) rows = rows.filter((n) => n.handlerEmpId === opts.handlerEmpId)
      if (opts.status && opts.status.length > 0) {
        const statuses = opts.status
        rows = rows.filter((n) => n.statDes != null && statuses.includes(n.statDes as TaskStatus))
      }
      const needle = query.trim()
      if (needle) rows = rows.filter((n) => n.subject.includes(needle) || n.custDes.includes(needle))
      return rows.slice(0, limitN)
    },

    async getCustNoteDetail(id) {
      await simulate('פרטי משימה')
      const found = custNotes.find((n) => n.id === id)
      if (!found) return null
      return {
        ...found,
        ownerName: found.ownerName ?? 'אלעד (מוק)',
        description: found.description ?? 'תיאור לדוגמה שנוסף לאחרונה.',
        history: found.history ?? [
          { date: '2026-08-01', status: 'טיוטא', handlerName: found.handlerEmpId },
          { date: '2026-08-05', status: found.statDes ?? 'לפיתוח', handlerName: found.handlerEmpId },
        ],
      }
    },

    async updateCustNote(id, changes) {
      await simulate('עדכון משימה')
      const idx = custNotes.findIndex((n) => n.id === id)
      if (idx === -1) throw new Error(`Priority (mock): משימה ${id} לא נמצאה`)
      custNotes[idx] = {
        ...custNotes[idx],
        ...(changes.status ? { statDes: changes.status } : {}),
        ...(changes.priority != null ? { priority: changes.priority } : {}),
        ...(changes.tillDate ? { tillDate: changes.tillDate } : {}),
        ...(changes.handlerEmpId ? { handlerEmpId: changes.handlerEmpId } : {}),
        ...(changes.description ? { description: changes.description } : {}),
      }
      return custNotes[idx]
    },
```

`opts` ו-`changes` בחתימות הפונקציות מקבלים את הטיפוס שלהם מהקשר (contextual typing) דרך ה-`PriorityAdapter` interface — לכן `SearchCustNotesOptions`/`UpdateCustNoteInput` לא נדרשים כ-import מפורש כאן; רק `TaskStatus` בשימוש ישיר (ב-`statuses.includes(n.statDes as TaskStatus)`).

- [ ] **Step 4: הרצה — לוודא הצלחה**

```bash
cd priority-lite
npm run test -w server
```
צפוי: PASS על כל בדיקות `mock-custnotes.test.ts` (וכל שאר בדיקות השרת הקיימות ממשיכות לעבור).

- [ ] **Step 5: Commit**

```bash
git add priority-lite/server/src/priority/mock.ts priority-lite/server/test/mock-custnotes.test.ts
git commit -m "feat(priority-lite): implement searchCustNotes/getCustNoteDetail/updateCustNote in mock adapter"
```

---

## Task 6: רשימת עובדים ב-`AppDB` (ל-"לטיפול")

**Files:**
- Modify: `priority-lite/server/src/db/interface.ts`
- Modify: `priority-lite/server/src/db/local-impl.ts`
- Modify: `priority-lite/server/src/db/supabase-impl.ts`
- Test: `priority-lite/server/test/employees.test.ts`

- [ ] **Step 1: כתיבת הבדיקה הכושלת**

```ts
// priority-lite/server/test/employees.test.ts
// בדיקת listActiveEmployees על local-impl (in-memory, בלי קובץ whitelist אמיתי).
import { describe, expect, it } from 'vitest'
import { createLocalDb } from '../src/db/local-impl'

describe('listActiveEmployees', () => {
  it('מחזיר רק עובדים פעילים', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.upsertEmployee({ phone: '0501111111', email: 'a@test.co', priorityEmpId: '42', name: 'אלעד' })
    await db.upsertEmployee({ phone: '0502222222', email: 'b@test.co', priorityEmpId: '99', name: 'רועי', active: false })

    const employees = await db.listActiveEmployees()
    expect(employees).toHaveLength(1)
    expect(employees[0].priority_emp_id).toBe('42')
  })

  it('בלי עובדים — מערך ריק', async () => {
    const db = createLocalDb('__nonexistent__')
    expect(await db.listActiveEmployees()).toEqual([])
  })
})
```

- [ ] **Step 2: הרצה — לוודא כישלון**

```bash
cd priority-lite
npm run test -w server
```
צפוי: FAIL — `db.listActiveEmployees is not a function`.

- [ ] **Step 3: הוספה לממשק**

ב-`priority-lite/server/src/db/interface.ts`, הוסף שורה אחרי `ping()`:

```ts
export interface AppDB {
  /** בקשת שמירה-על-חיים — נוגעת ב-DB כדי למנוע auto-pause בפרויקטי Supabase free-tier. */
  ping(): Promise<void>
  /** כל העובדים הפעילים — לבורר "לטיפול" בניהול משימות. */
  listActiveEmployees(): Promise<EmployeeRow[]>
  findEmployee(phone: string): Promise<EmployeeRow | undefined>
  // ... (שאר הממשק נשאר ללא שינוי)
```

- [ ] **Step 4: מימוש ב-local-impl.ts**

ב-`priority-lite/server/src/db/local-impl.ts`, הוסף בתוך האובייקט המוחזר (אחרי `async ping() {...}`):

```ts
    async listActiveEmployees() {
      return [...employees.values()].filter((e) => e.active)
    },
```

- [ ] **Step 5: מימוש ב-supabase-impl.ts**

ב-`priority-lite/server/src/db/supabase-impl.ts`, הוסף בתוך האובייקט המוחזר (אחרי `async ping() {...}`):

```ts
    async listActiveEmployees() {
      const { data, error } = await client
        .from('employees')
        .select('phone, email, priority_emp_id, name, active, totp_secret')
        .eq('active', true)
        .order('name')
      if (error) throw new Error(`listActiveEmployees failed: ${error.message}`)
      return (data as EmployeeRow[]) ?? []
    },
```

- [ ] **Step 6: הרצה — לוודא הצלחה**

```bash
cd priority-lite
npm run test -w server
```
צפוי: PASS (כולל כל הבדיקות הקיימות).

- [ ] **Step 7: Commit**

```bash
git add priority-lite/server/src/db/interface.ts priority-lite/server/src/db/local-impl.ts priority-lite/server/src/db/supabase-impl.ts priority-lite/server/test/employees.test.ts
git commit -m "feat(priority-lite): add listActiveEmployees to AppDB for assignee picker"
```

---

## Task 7: שכבת ה-Actions (סכמות zod + פונקציות)

**Files:**
- Modify: `priority-lite/server/src/actions/index.ts`
- Test: `priority-lite/server/test/custnotes-actions.test.ts`

- [ ] **Step 1: כתיבת הבדיקות הכושלות**

```ts
// priority-lite/server/test/custnotes-actions.test.ts
// בדיקות לשכבת ה-actions החדשה מול ה-mock adapter.
import { describe, expect, it } from 'vitest'
import type { Me } from '@priority-lite/shared'
import {
  getCustNoteDetail,
  listEmployees,
  searchCustNotes,
  searchCustNotesSchema,
  updateCustNote,
  updateCustNoteSchema,
} from '../src/actions'
import { createMockAdapter } from '../src/priority/mock'
import { createLocalDb } from '../src/db/local-impl'

const me: Me = { phone: '0501234567', name: 'אלעד', priorityEmpId: '42' }

describe('searchCustNotes action', () => {
  it('mine=true ממופה ל-handlerEmpId של המשתמש המחובר', async () => {
    const adapter = createMockAdapter()
    const parsed = searchCustNotesSchema.parse({ q: '', mine: true, limit: 50 })
    const hits = await searchCustNotes(adapter, me, parsed)
    expect(hits.length).toBeGreaterThan(0)
    for (const n of hits) expect(n.handlerEmpId).toBe('42')
  })

  it('mine=false — לא מסונן לפי משתמש', async () => {
    const adapter = createMockAdapter()
    const parsed = searchCustNotesSchema.parse({ q: '', mine: false, limit: 50 })
    const hits = await searchCustNotes(adapter, me, parsed)
    const distinctHandlers = new Set(hits.map((n) => n.handlerEmpId))
    expect(distinctHandlers.size).toBeGreaterThan(1)
  })

  it('סטטוס לא חוקי נדחה בסכימה', () => {
    expect(() => searchCustNotesSchema.parse({ status: ['לא-קיים'] })).toThrow()
  })
})

describe('getCustNoteDetail action', () => {
  it('מחזיר פרטי משימה', async () => {
    const adapter = createMockAdapter()
    const detail = await getCustNoteDetail(adapter, me, 5001)
    expect(detail?.subject).toContain('הטמעה')
  })
})

describe('updateCustNote action', () => {
  it('מעדכן סטטוס תקין', async () => {
    const adapter = createMockAdapter()
    const parsed = updateCustNoteSchema.parse({ status: 'בוצעה' })
    const updated = await updateCustNote(adapter, me, 5001, parsed)
    expect(updated.statDes).toBe('בוצעה')
  })

  it('סטטוס לא חוקי נדחה בסכימה', () => {
    expect(() => updateCustNoteSchema.parse({ status: 'לא-קיים' })).toThrow()
  })

  it('עדיפות מחוץ לטווח נדחית', () => {
    expect(() => updateCustNoteSchema.parse({ priority: 150 })).toThrow()
  })
})

describe('listEmployees action', () => {
  it('מחזיר רק שם ומזהה — לא טלפון/totp', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.upsertEmployee({ phone: '0501111111', email: 'a@test.co', priorityEmpId: '42', name: 'אלעד' })
    const employees = await listEmployees(db, me)
    expect(employees).toEqual([{ priorityEmpId: '42', name: 'אלעד' }])
  })
})
```

- [ ] **Step 2: הרצה — לוודא כישלון**

```bash
cd priority-lite
npm run test -w server
```
צפוי: FAIL — הפונקציות/הסכמות עדיין לא קיימות ב-`actions/index.ts`.

- [ ] **Step 3: מימוש**

ב-`priority-lite/server/src/actions/index.ts`, עדכן את שורת ה-import הראשונה:

```ts
import { z } from 'zod'
import type { Me, SyncItemResult } from '@priority-lite/shared'
import { TASK_STATUSES } from '@priority-lite/shared'
import type { AppDB } from '../db/db'
import type { PriorityAdapter } from '../priority/adapter'
```

הוסף בסוף הקובץ:

```ts
export const searchCustNotesSchema = z.object({
  q: z.string().default(''),
  mine: z.boolean().default(false),
  status: z.array(z.enum([...TASK_STATUSES])).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function searchCustNotes(
  adapter: PriorityAdapter,
  me: Me,
  input: z.infer<typeof searchCustNotesSchema>,
) {
  return adapter.searchCustNotes(
    input.q,
    { handlerEmpId: input.mine ? me.priorityEmpId : undefined, status: input.status },
    input.limit,
  )
}

export async function getCustNoteDetail(adapter: PriorityAdapter, _me: Me, id: number) {
  return adapter.getCustNoteDetail(id)
}

export const updateCustNoteSchema = z.object({
  status: z.enum([...TASK_STATUSES]).optional(),
  priority: z.number().int().min(0).max(99).optional(),
  tillDate: z.string().regex(dateRe).optional(),
  handlerEmpId: z.string().min(1).optional(),
  description: z.string().min(1).max(2000).optional(),
})

export async function updateCustNote(
  adapter: PriorityAdapter,
  _me: Me,
  id: number,
  input: z.infer<typeof updateCustNoteSchema>,
) {
  return adapter.updateCustNote(id, input)
}

/** רשימת עובדי priority-lite לבורר "לטיפול". SECURITY: לא חושף טלפון/totp_secret. */
export async function listEmployees(db: AppDB, _me: Me) {
  const rows = await db.listActiveEmployees()
  return rows.map((r) => ({ priorityEmpId: r.priority_emp_id, name: r.name }))
}
```

שים לב: `dateRe` כבר מוגדר בראש הקובץ (`const dateRe = /^\d{4}-\d{2}-\d{2}$/`) — לא צריך להוסיף אותו שוב.

- [ ] **Step 4: הרצה — לוודא הצלחה**

```bash
cd priority-lite
npm run test -w server
npx tsc -p server --noEmit
```
צפוי: PASS על כל הבדיקות, טייפצ'ק נקי.

- [ ] **Step 5: Commit**

```bash
git add priority-lite/server/src/actions/index.ts priority-lite/server/test/custnotes-actions.test.ts
git commit -m "feat(priority-lite): add searchCustNotes/getCustNoteDetail/updateCustNote/listEmployees actions"
```

---

## Task 8: מימוש אמיתי מול פריוריטי (`odata.ts`)

**Files:**
- Modify: `priority-lite/server/src/priority/odata.ts`

**חשוב — סעיף פתוח מ-Task 1:** כתיבת סטטוס ו"לטיפול" (`USERLOGIN`) אומתו חי ועובדים. שם תת-הטופס לתיאור אומת (`CUSTNOTESTEXT_SUBFORM`), אבל **סמנטיקת append-מול-דריסה של ה-POST לתיאור לא הושלמה חי** (פריוריטי הפכה ללא-יציבה זמנית באמצע הבדיקה — 404/401 חוזרים על סבב שכבר עבד קודם). לפני שסומכים על ההתנהגות בייצור: כשפריוריטי יציבה שוב, הרץ בדיקה ממוקדת וקטנה (לא הסקריפט המלא) — POST ערך אחד לתיאור, POST ערך שני, GET לבדוק אם שניהם מופיעים או שהשני דרס את הראשון. אם מתברר שזו דריסה — יש לשנות את הקוד למטה: לקרוא את התיאור הקיים לפני POST ולשרשר אליו, במקום לשלוח רק את הערך החדש.

- [ ] **Step 1: הוספת helper לתרגום שורה ל-`CustNote`**

ב-`priority-lite/server/src/priority/odata.ts`, עדכן את שורת ה-import (`SearchCustNotesOptions` לא צריך import מפורש — מגיע דרך ה-`PriorityAdapter` interface בהקשר):

```ts
import type { CustNote, TaskSummary, UpdateCustNoteInput } from '@priority-lite/shared'
```

הוסף שתי פונקציות עצמאיות מיד אחרי `rowToTask` הקיימת (לפני `toHours`) — `rowToCustNote` הופכת שורה גולמית ל-`CustNote`, ו-`fetchCustNoteDetail` (פונקציה עצמאית, לא מתודה על ה-object המוחזר) שולפת פרטים מלאים כולל תיאור והיסטוריה; היא מוגדרת כפונקציה עצמאית דווקא כדי ש-`updateCustNote` יוכל לקרוא לה ישירות בסוף (אי אפשר להשתמש ב-`this` בתוך object literal):

```ts
  function rowToCustNote(row: Row): CustNote {
    const cf = m.custNoteFields
    return {
      id: Number(row[cf.id] ?? 0),
      subject: String(row[cf.subject] ?? ''),
      custName: String(row[cf.custName] ?? ''),
      custDes: String(row[cf.custDes] ?? ''),
      statDes: row[cf.statDes] != null ? String(row[cf.statDes]) : undefined,
      tillDate: row[cf.tillDate] != null ? String(row[cf.tillDate]).slice(0, 10) : undefined,
      projDocNo: row[cf.projDocNo] != null ? String(row[cf.projDocNo]).trim() || undefined : undefined,
      hoursReported: row[cf.hours] != null ? Number(row[cf.hours]) : undefined,
      priority: row[cf.priority] != null ? Number(row[cf.priority]) : undefined,
      handlerEmpId: row[cf.handler] != null ? String(row[cf.handler]) : undefined,
    }
  }

  async function fetchCustNoteDetail(id: number): Promise<CustNote | null> {
    const cf = m.custNoteFields
    const select = [cf.id, cf.subject, cf.custName, cf.custDes, cf.statDes, cf.tillDate, cf.projDocNo, cf.hours, cf.priority, cf.owner, cf.handler].join(',')
    const data = await request<{ value: Row[] }>(
      `${m.entities.custNotes}?$select=${select}&$filter=${cf.id} eq ${id}&$top=1`,
    )
    const row = data.value[0]
    if (!row) return null
    const base = rowToCustNote(row)
    base.ownerName = row[cf.owner] != null ? String(row[cf.owner]) : undefined

    const textData = await request<{ value: Row[] }>(
      `${m.entities.custNotes}(CUSTNOTE=${id})/${m.custNoteTextSubform}?$select=${m.custNoteTextFields.text}`,
    ).catch(() => ({ value: [] as Row[] }))
    const textRow = textData.value[0]
    base.description = textRow?.[m.custNoteTextFields.text] != null
      ? String(textRow[m.custNoteTextFields.text])
      : undefined

    const logData = await request<{ value: Row[] }>(
      `${m.entities.custNotes}(CUSTNOTE=${id})/${m.custNoteLogSubform}` +
        `?$select=${m.custNoteLogFields.date},${m.custNoteLogFields.status},${m.custNoteLogFields.handler},${m.custNoteLogFields.initiator}` +
        `&$orderby=${m.custNoteLogFields.date} desc`,
    ).catch(() => ({ value: [] as Row[] }))
    base.history = logData.value.map((r) => ({
      date: String(r[m.custNoteLogFields.date] ?? '').slice(0, 10),
      status: String(r[m.custNoteLogFields.status] ?? ''),
      handlerName: r[m.custNoteLogFields.handler] != null ? String(r[m.custNoteLogFields.handler]) : undefined,
      initiatorName: r[m.custNoteLogFields.initiator] != null ? String(r[m.custNoteLogFields.initiator]) : undefined,
    }))

    return base
  }
```

- [ ] **Step 2: הוספת שלוש המתודות ל-object המוחזר**

הוסף בתוך האובייקט המוחזר, אחרי `createCustNote` (לפני `getTimeEntries`):

```ts
    async searchCustNotes(query, opts, limitN = 50) {
      const cf = m.custNoteFields
      const select = [cf.id, cf.subject, cf.custName, cf.custDes, cf.statDes, cf.tillDate, cf.projDocNo, cf.hours, cf.priority, cf.handler].join(',')
      const filters = [`${cf.closed} eq 'N'`]
      if (opts.handlerEmpId) filters.push(`${cf.handler} eq '${escapeOData(opts.handlerEmpId)}'`)
      if (opts.status && opts.status.length > 0) {
        filters.push('(' + opts.status.map((s) => `${cf.statDes} eq '${escapeOData(s)}'`).join(' or ') + ')')
      }
      // OData לא תומך ב-contains() — טוענים עד 500 עם הפילטרים המבניים, ומסננים טקסט חופשי אצלנו
      // (אותו דפוס כמו fetchAllTasks למעלה).
      const data = await request<{ value: Row[] }>(
        `${m.entities.custNotes}?$select=${select}&$filter=${encodeURI(filters.join(' and '))}&$orderby=${cf.id} desc&$top=500`,
      )
      const needle = query.trim()
      const rows = needle
        ? data.value.filter(
            (row) => String(row[cf.subject] ?? '').includes(needle) || String(row[cf.custDes] ?? '').includes(needle),
          )
        : data.value
      return rows.slice(0, limitN).map(rowToCustNote)
    },

    async getCustNoteDetail(id) {
      return fetchCustNoteDetail(id)
    },

    async updateCustNote(id, changes: UpdateCustNoteInput) {
      const cf = m.custNoteFields
      const body: Row = {}
      if (changes.status) body[cf.statDes] = changes.status
      if (changes.priority != null) body[cf.priority] = changes.priority
      if (changes.tillDate) body[cf.tillDate] = changes.tillDate
      if (changes.handlerEmpId) body[cf.handler] = changes.handlerEmpId

      if (Object.keys(body).length > 0) {
        await request<Row>(`${m.entities.custNotes}(CUSTNOTE=${id})`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }

      if (changes.description) {
        await request<Row>(`${m.entities.custNotes}(CUSTNOTE=${id})/${m.custNoteTextSubform}`, {
          method: 'POST',
          body: JSON.stringify({ [m.custNoteTextFields.text]: changes.description }),
        })
      }

      const updated = await fetchCustNoteDetail(id)
      if (!updated) throw new Error('משימה לא נמצאה לאחר עדכון')
      return updated
    },
```

- [ ] **Step 3: טייפצ'ק**

```bash
cd priority-lite
npx tsc -p server --noEmit
```
צפוי: ללא שגיאות.

- [ ] **Step 4: הרצת כל בדיקות השרת (odata.ts לא נבדק אוטומטית, אבל שאר הבדיקות לא אמורות להישבר)**

```bash
cd priority-lite
npm run test -w server
```
צפוי: PASS על הכל.

- [ ] **Step 5: Commit**

```bash
git add priority-lite/server/src/priority/odata.ts
git commit -m "feat(priority-lite): implement searchCustNotes/getCustNoteDetail/updateCustNote against real Priority"
```

---

## Task 9: Routes חדשים (`/api/custnotes`, `/api/employees`)

**Files:**
- Create: `priority-lite/server/src/routes/custnotes.ts`
- Create: `priority-lite/server/src/routes/employees.ts`
- Modify: `priority-lite/server/src/app.ts`

- [ ] **Step 1: יצירת `routes/custnotes.ts`**

```ts
// priority-lite/server/src/routes/custnotes.ts
// מסלולי ניהול משימות גלובליים — חיפוש, פרטי משימה, עדכון.
// (נפרד מ-/api/tasks/:id/custnotes הקיים, שמשמש ליצירה בהקשר פרויקט ספציפי.)
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import {
  getCustNoteDetail,
  searchCustNotes,
  searchCustNotesSchema,
  updateCustNote,
  updateCustNoteSchema,
} from '../actions'

export function createCustNoteRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.get('/', async (c) => {
    const parsed = searchCustNotesSchema.safeParse({
      q: c.req.query('q'),
      mine: c.req.query('mine') === 'true',
      status: c.req.queries('status'),
      limit: c.req.query('limit'),
    })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await searchCustNotes(ctx.adapter, c.get('me'), parsed.data))
  })

  app.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const detail = await getCustNoteDetail(ctx.adapter, c.get('me'), id)
    if (!detail) return c.json({ error: 'משימה לא נמצאה' }, 404)
    return c.json(detail)
  })

  app.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const body = await c.req.json().catch(() => null)
    const parsed = updateCustNoteSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)

    // "לטיפול" מוגבל לעובדי priority-lite בלבד — לא סומכים על הקליינט
    if (parsed.data.handlerEmpId) {
      const employees = await ctx.db.listActiveEmployees()
      if (!employees.some((e) => e.priority_emp_id === parsed.data.handlerEmpId)) {
        return c.json({ error: 'איש הצוות שנבחר אינו ברשימת המשתמשים' }, 400)
      }
    }

    try {
      const updated = await updateCustNote(ctx.adapter, c.get('me'), id, parsed.data)
      return c.json(updated)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'שגיאה בעדכון המשימה' }, 500)
    }
  })

  return app
}
```

- [ ] **Step 2: יצירת `routes/employees.ts`**

```ts
// priority-lite/server/src/routes/employees.ts
// רשימת עובדי priority-lite — לבורר "לטיפול" בניהול משימות.
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import { listEmployees } from '../actions'

export function createEmployeeRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.get('/', async (c) => {
    return c.json(await listEmployees(ctx.db, c.get('me')))
  })

  return app
}
```

- [ ] **Step 3: רישום ב-`app.ts`**

עדכן את שורות ה-import בראש `priority-lite/server/src/app.ts`:

```ts
import { Hono } from 'hono'
import type { AppContext } from './context'
import { createAuthRoutes } from './routes/auth'
import { createCronRoutes } from './routes/cron'
import { createCustNoteRoutes } from './routes/custnotes'
import { createEmployeeRoutes } from './routes/employees'
import { createParseRoutes } from './routes/parse'
import { createTaskRoutes } from './routes/tasks'
import { createTimeEntryRoutes } from './routes/timeEntries'
```

והוסף שתי שורות אחרי `app.route('/api/cron', createCronRoutes(ctx))`:

```ts
  app.route('/api/cron', createCronRoutes(ctx))
  app.route('/api/custnotes', createCustNoteRoutes(ctx))
  app.route('/api/employees', createEmployeeRoutes(ctx))
```

- [ ] **Step 4: טייפצ'ק + בדיקות מלאות**

```bash
cd priority-lite
npx tsc -p server --noEmit
npm run test -w server
```
צפוי: הכל נקי ועובר (26+ בדיקות: הקיימות + כל מה שנוסף ב-Task 5-7).

- [ ] **Step 5: Commit**

```bash
git add priority-lite/server/src/routes/custnotes.ts priority-lite/server/src/routes/employees.ts priority-lite/server/src/app.ts
git commit -m "feat(priority-lite): wire /api/custnotes and /api/employees routes"
```

---

## Task 10: טיפוסי הקליינט (`client/src/types.ts`)

**Files:**
- Modify: `priority-lite/client/src/types.ts`

- [ ] **Step 1: הוספת re-exports**

עדכן את בלוק ה-`export type {...}` בראש הקובץ (מוסיף שמות חדשים לרשימה הקיימת):

```ts
export type {
  CreateCustNoteInput,
  CreateTaskInput,
  CustNote,
  EmployeeSummary,
  Me,
  ProjectSite,
  RemoteTimeEntry,
  SearchCustNotesOptions,
  SyncItemResult,
  TaskDetail,
  TaskStatus,
  TaskStatusLogEntry,
  TaskSummary,
  TimeEntryInput,
  UpdateCustNoteInput,
} from '@priority-lite/shared'
export { TASK_STATUSES } from '@priority-lite/shared'
```

- [ ] **Step 2: טייפצ'ק**

```bash
cd priority-lite
npx tsc -p client --noEmit
```
צפוי: ללא שגיאות.

- [ ] **Step 3: Commit**

```bash
git add priority-lite/client/src/types.ts
git commit -m "feat(priority-lite): re-export task-management types on client"
```

---

## Task 11: שכבת הנתונים בקליינט (`state/useCustNotes.ts`)

**Files:**
- Create: `priority-lite/client/src/state/useCustNotes.ts`
- Test: `priority-lite/client/src/state/useCustNotes.test.ts`

- [ ] **Step 1: כתיבת הבדיקה הכושלת ל-`buildQuery`**

`buildQuery` היא הלוגיקה הטהורה היחידה בשכבה הזו (שאר הפונקציות הן עטיפות דקות סביב `api()`, נבדקות בפועל דרך המסכים) — נבדקת ישירות, בלי שרת/Dexie:

```ts
// priority-lite/client/src/state/useCustNotes.test.ts
import { describe, expect, it } from 'vitest'
import { buildQuery } from './useCustNotes'

describe('buildQuery', () => {
  it('ריק — בלי פרמטרים', () => {
    expect(buildQuery({})).toBe('')
  })

  it('q בלבד', () => {
    expect(buildQuery({ q: 'גיבוי' })).toBe(`q=${encodeURIComponent('גיבוי')}`)
  })

  it('mine=true מתווסף רק כשאמת', () => {
    expect(buildQuery({ mine: true })).toBe('mine=true')
    expect(buildQuery({ mine: false })).toBe('')
  })

  it('כמה ערכי status מתווספים כפרמטרים חוזרים', () => {
    const qs = buildQuery({ status: ['לפיתוח', 'בוצעה'] })
    const params = new URLSearchParams(qs)
    expect(params.getAll('status')).toEqual(['לפיתוח', 'בוצעה'])
  })

  it('שילוב של כל הפרמטרים יחד', () => {
    const qs = buildQuery({ q: 'x', mine: true, status: ['טיוטא'] })
    const params = new URLSearchParams(qs)
    expect(params.get('q')).toBe('x')
    expect(params.get('mine')).toBe('true')
    expect(params.getAll('status')).toEqual(['טיוטא'])
  })
})
```

- [ ] **Step 2: הרצה — לוודא כישלון**

```bash
cd priority-lite
npm run test -w client
```
צפוי: FAIL — `useCustNotes.ts` עוד לא קיים.

- [ ] **Step 3: כתיבת הקובץ**

```ts
// priority-lite/client/src/state/useCustNotes.ts
// קריאות ישירות לשרת (בלי Dexie) — אותו דפוס כמו TaskPicker הקיים.
import { api } from '../lib/api'
import type { CustNote, EmployeeSummary, TaskStatus, UpdateCustNoteInput } from '../types'

export interface SearchCustNotesParams {
  q?: string
  mine?: boolean
  status?: TaskStatus[]
}

export function buildQuery(params: SearchCustNotesParams): string {
  const usp = new URLSearchParams()
  if (params.q) usp.set('q', params.q)
  if (params.mine) usp.set('mine', 'true')
  for (const s of params.status ?? []) usp.append('status', s)
  return usp.toString()
}

export async function searchCustNotes(params: SearchCustNotesParams): Promise<CustNote[]> {
  return api<CustNote[]>(`/api/custnotes?${buildQuery(params)}`)
}

export async function getCustNoteDetail(id: number): Promise<CustNote> {
  return api<CustNote>(`/api/custnotes/${id}`)
}

export async function updateCustNote(id: number, changes: UpdateCustNoteInput): Promise<CustNote> {
  return api<CustNote>(`/api/custnotes/${id}`, { method: 'PATCH', json: changes })
}

export async function listEmployees(): Promise<EmployeeSummary[]> {
  return api<EmployeeSummary[]>('/api/employees')
}
```

- [ ] **Step 4: הרצה — לוודא הצלחה**

```bash
cd priority-lite
npm run test -w client
npx tsc -p client --noEmit
```
צפוי: PASS על כל בדיקות `useCustNotes.test.ts` (וכל השאר הקיימות), טייפצ'ק נקי.

- [ ] **Step 5: Commit**

```bash
git add priority-lite/client/src/state/useCustNotes.ts priority-lite/client/src/state/useCustNotes.test.ts
git commit -m "feat(priority-lite): add client data layer for task management (useCustNotes)"
```

---

## Task 12: קומפוננטת `AssigneePicker`

**Files:**
- Create: `priority-lite/client/src/components/AssigneePicker.tsx`

- [ ] **Step 1: כתיבת הקומפוננטה**

```tsx
// priority-lite/client/src/components/AssigneePicker.tsx
// בורר "לטיפול" — רשימת עובדי priority-lite בלבד (לא כל משתמשי פריוריטי).
import { useEffect, useState } from 'react'
import { listEmployees } from '../state/useCustNotes'
import type { EmployeeSummary } from '../types'
import { Modal } from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (employee: EmployeeSummary) => void
}

export function AssigneePicker({ open, onClose, onSelect }: Props) {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    listEmployees()
      .then(setEmployees)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת עובדים'))
      .finally(() => setLoading(false))
  }, [open])

  return (
    <Modal open={open} title="העבר לטיפול של" onClose={onClose}>
      {loading && <p className="py-4 text-center text-slate-500">טוען…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {employees.map((e) => (
          <button
            key={e.priorityEmpId}
            onClick={() => {
              onSelect(e)
              onClose()
            }}
            className="block w-full rounded-xl px-3 py-2.5 text-right text-slate-100 transition hover:bg-slate-800"
          >
            {e.name}
          </button>
        ))}
        {!loading && employees.length === 0 && (
          <p className="py-4 text-center text-slate-600">אין עובדים ברשימה</p>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: טייפצ'ק**

```bash
cd priority-lite
npx tsc -p client --noEmit
```
צפוי: ללא שגיאות.

- [ ] **Step 3: Commit**

```bash
git add priority-lite/client/src/components/AssigneePicker.tsx
git commit -m "feat(priority-lite): add AssigneePicker component"
```

---

## Task 13: קומפוננטת `NewCustNoteModal`

**Files:**
- Create: `priority-lite/client/src/components/NewCustNoteModal.tsx`

- [ ] **Step 1: כתיבת הקומפוננטה**

מרחיב את הטופס הקיים (משתמש באותו endpoint `/api/tasks/:id/custnotes` שכבר עובד ב-`ManualEntryModal`), עם נקודת כניסה עצמאית מהטאב "משימות":

```tsx
// priority-lite/client/src/components/NewCustNoteModal.tsx
// יצירת משימה חדשה מהטאב "משימות" — משתמש ב-endpoint הקיים ליצירת CUSTNOTESA בהקשר פרויקט.
import { useState } from 'react'
import { api } from '../lib/api'
import type { CustNote, TaskSummary } from '../types'
import { Field, PrimaryButton, TextInput } from './forms'
import { Modal } from './Modal'
import { TaskPicker } from './TaskPicker'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (note: CustNote) => void
}

export function NewCustNoteModal({ open, onClose, onCreated }: Props) {
  const [task, setTask] = useState<TaskSummary | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [tillDate, setTillDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setTask(null)
    setSubject('')
    setTillDate('')
    setError('')
  }

  const create = async () => {
    if (!task) return setError('בחר פרויקט')
    if (!subject.trim()) return setError('כתוב נושא למשימה')
    setLoading(true)
    setError('')
    try {
      const created = await api<CustNote>(`/api/tasks/${encodeURIComponent(task.id)}/custnotes`, {
        method: 'POST',
        json: { subject: subject.trim(), tillDate: tillDate || undefined },
      })
      onCreated(created)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת המשימה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="משימה חדשה"
      onClose={() => {
        reset()
        onClose()
      }}
    >
      <div className="space-y-3">
        <Field label="פרויקט">
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-right text-slate-100"
          >
            {task ? (
              <>
                <span className="block">{task.name}</span>
                <span className="block text-xs text-slate-500">{task.projectName}</span>
              </>
            ) : (
              <span className="text-slate-500">לחץ לבחירת פרויקט…</span>
            )}
          </button>
        </Field>
        <Field label="נושא *">
          <TextInput
            placeholder="תיאור קצר של המשימה"
            value={subject}
            maxLength={52}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field label="תאריך יעד">
          <TextInput type="date" value={tillDate} onChange={(e) => setTillDate(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <PrimaryButton onClick={create} disabled={loading}>
          {loading ? 'שולח…' : 'צור משימה'}
        </PrimaryButton>
      </div>
      <TaskPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={setTask} />
    </Modal>
  )
}
```

- [ ] **Step 2: טייפצ'ק**

```bash
cd priority-lite
npx tsc -p client --noEmit
```
צפוי: ללא שגיאות.

- [ ] **Step 3: Commit**

```bash
git add priority-lite/client/src/components/NewCustNoteModal.tsx
git commit -m "feat(priority-lite): add NewCustNoteModal for task creation from Tasks tab"
```

---

## Task 14: מסך "משימות" (`screens/Tasks.tsx`)

**Files:**
- Create: `priority-lite/client/src/screens/Tasks.tsx`

- [ ] **Step 1: כתיבת המסך**

```tsx
// priority-lite/client/src/screens/Tasks.tsx
// מסך "משימות" — טאב "שלי"/"הכל", חיפוש, פילטר סטטוס, יצירת משימה.
import { useEffect, useState } from 'react'
import { NewCustNoteModal } from '../components/NewCustNoteModal'
import { searchCustNotes } from '../state/useCustNotes'
import { TASK_STATUSES } from '../types'
import type { CustNote, TaskStatus } from '../types'

type Scope = 'mine' | 'all'

interface Props {
  onOpenTask: (id: number) => void
}

export function Tasks({ onOpenTask }: Props) {
  const [scope, setScope] = useState<Scope>('mine')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([])
  const [notes, setNotes] = useState<CustNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      searchCustNotes({ q, mine: scope === 'mine', status: statusFilter.length ? statusFilter : undefined })
        .then(setNotes)
        .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת משימות'))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, scope, statusFilter, refreshKey])

  const toggleStatus = (s: TaskStatus) => {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  return (
    <div className="space-y-3 pb-6">
      <div className="flex gap-1 rounded-xl bg-slate-800 p-1">
        {(['mine', 'all'] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`flex-1 rounded-lg py-1.5 text-sm transition ${
              scope === s ? 'bg-slate-600 text-slate-100' : 'text-slate-400'
            }`}
          >
            {s === 'mine' ? 'שלי' : 'הכל'}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חפש משימה…"
        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
      />

      <button
        onClick={() => setNewOpen(true)}
        className="w-full rounded-xl border border-violet-600 bg-violet-900/30 px-3 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-900/50"
      >
        + משימה חדשה
      </button>

      <div className="flex flex-wrap gap-1.5">
        {TASK_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              statusFilter.includes(s)
                ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300'
                : 'border-slate-700 text-slate-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p className="py-4 text-center text-slate-500">טוען…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!loading && notes.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-600">לא נמצאו משימות</p>
      )}

      <div className="space-y-1.5">
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => onOpenTask(n.id)}
            className="block w-full rounded-2xl bg-slate-800/40 p-3 text-right ring-1 ring-slate-700/50"
          >
            <span className="block font-medium text-slate-100">{n.subject}</span>
            <span className="block text-xs text-slate-500">
              {n.custDes}
              {n.statDes ? ` · ${n.statDes}` : ''}
              {n.tillDate ? ` · יעד ${n.tillDate}` : ''}
            </span>
          </button>
        ))}
      </div>

      <NewCustNoteModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
```

- [ ] **Step 2: טייפצ'ק**

```bash
cd priority-lite
npx tsc -p client --noEmit
```
צפוי: ללא שגיאות.

- [ ] **Step 3: Commit**

```bash
git add priority-lite/client/src/screens/Tasks.tsx
git commit -m "feat(priority-lite): add Tasks list screen (mine/all, search, status filter)"
```

---

## Task 15: מסך פרטי משימה (`screens/TaskDetail.tsx`)

**Files:**
- Create: `priority-lite/client/src/screens/TaskDetail.tsx`

- [ ] **Step 1: כתיבת המסך**

```tsx
// priority-lite/client/src/screens/TaskDetail.tsx
// מסך פרטי משימה — עריכת סטטוס/עדיפות/תאריך/לטיפול/תיאור, היסטוריית סטטוס.
import { useEffect, useState } from 'react'
import { AssigneePicker } from '../components/AssigneePicker'
import { getCustNoteDetail, updateCustNote } from '../state/useCustNotes'
import { TASK_STATUSES } from '../types'
import type { CustNote, EmployeeSummary, UpdateCustNoteInput } from '../types'

interface Props {
  id: number
  onBack: () => void
}

export function TaskDetail({ id, onBack }: Props) {
  const [note, setNote] = useState<CustNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [descriptionText, setDescriptionText] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    getCustNoteDetail(id)
      .then(setNote)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת המשימה'))
      .finally(() => setLoading(false))
  }, [id])

  const applyChange = async (changes: UpdateCustNoteInput) => {
    if (!note) return
    const previous = note
    setNote({ ...note, ...changes, statDes: changes.status ?? note.statDes })
    setSaving(true)
    setError('')
    try {
      const updated = await updateCustNote(id, changes)
      setNote(updated)
    } catch (err) {
      setNote(previous)
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון — נסה שוב')
    } finally {
      setSaving(false)
    }
  }

  const saveDescription = async () => {
    if (!descriptionText.trim()) return
    await applyChange({ description: descriptionText.trim() })
    setDescriptionText('')
  }

  if (loading) return <p className="py-6 text-center text-slate-500">טוען…</p>
  if (!note) return <p className="py-6 text-center text-rose-400">{error || 'משימה לא נמצאה'}</p>

  return (
    <div className="space-y-4 pb-6">
      <button onClick={onBack} className="text-sm text-slate-400">
        ← חזרה
      </button>

      <div className="rounded-2xl bg-slate-800/40 p-4 ring-1 ring-slate-700/50">
        <h2 className="text-lg font-bold text-slate-100">{note.subject}</h2>
        <p className="text-sm text-slate-500">{note.custDes}</p>
        {note.hoursReported != null && (
          <p className="mt-1 text-xs text-slate-500">שעות שדווחו: {note.hoursReported}</p>
        )}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="space-y-1">
        <p className="text-xs text-slate-500">סטטוס</p>
        <div className="flex flex-wrap gap-1.5">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              disabled={saving}
              onClick={() => applyChange({ status: s })}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                note.statDes === s
                  ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300'
                  : 'border-slate-700 text-slate-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">עדיפות (0-99)</p>
          <input
            type="number"
            min={0}
            max={99}
            defaultValue={note.priority ?? ''}
            onBlur={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined
              if (v != null && v >= 0 && v <= 99) applyChange({ priority: v })
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">תאריך יעד</p>
          <input
            type="date"
            defaultValue={note.tillDate ?? ''}
            onBlur={(e) => {
              if (e.target.value) applyChange({ tillDate: e.target.value })
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-500">אחראי משימה</p>
        <p className="text-sm text-slate-300">{note.ownerName ?? '—'}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-500">לטיפול</p>
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-right text-slate-100"
        >
          {note.handlerName ?? note.handlerEmpId ?? 'בחר איש צוות…'}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">תיאור</p>
        {note.description && (
          <p className="whitespace-pre-wrap rounded-xl bg-slate-800/60 p-3 text-sm text-slate-300">
            {note.description}
          </p>
        )}
        <textarea
          value={descriptionText}
          onChange={(e) => setDescriptionText(e.target.value)}
          placeholder="הוסף עדכון…"
          rows={3}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
        />
        <button
          onClick={saveDescription}
          disabled={saving || !descriptionText.trim()}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          הוסף עדכון
        </button>
      </div>

      <div>
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm text-slate-400"
        >
          <span>היסטוריית סטטוס</span>
          <span style={{ transform: historyOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>
        {historyOpen && (
          <div className="mt-2 space-y-1.5">
            {(note.history ?? []).map((h, i) => (
              <div key={i} className="rounded-xl bg-slate-800/40 p-2.5 text-xs text-slate-400">
                <span className="text-slate-300">{h.status}</span> · {h.date}
                {h.handlerName ? ` · ${h.handlerName}` : ''}
              </div>
            ))}
            {(note.history ?? []).length === 0 && <p className="text-xs text-slate-600">אין היסטוריה</p>}
          </div>
        )}
      </div>

      <AssigneePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(e: EmployeeSummary) => applyChange({ handlerEmpId: e.priorityEmpId })}
      />
    </div>
  )
}
```

- [ ] **Step 2: טייפצ'ק**

```bash
cd priority-lite
npx tsc -p client --noEmit
```
צפוי: ללא שגיאות.

- [ ] **Step 3: Commit**

```bash
git add priority-lite/client/src/screens/TaskDetail.tsx
git commit -m "feat(priority-lite): add TaskDetail screen (edit status/priority/handler/description, history)"
```

---

## Task 16: חיווט לניווט (`App.tsx`, `BottomNav.tsx`)

**Files:**
- Modify: `priority-lite/client/src/components/BottomNav.tsx`
- Modify: `priority-lite/client/src/App.tsx`

- [ ] **Step 1: עדכון `BottomNav.tsx`**

עדכן את שורת ה-`Tab` type ואת מערך ה-`TABS`:

```ts
export type Tab = 'today' | 'entries' | 'tasks' | 'summary' | 'settings'
```

```ts
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'היום', icon: '🕒' },
  { id: 'entries', label: 'דיווחים', icon: '📋' },
  { id: 'tasks', label: 'משימות', icon: '📝' },
  { id: 'summary', label: 'סיכום', icon: '📊' },
  { id: 'settings', label: 'הגדרות', icon: '⚙️' },
]
```

(שאר הקובץ — כולל ה-badge של `pendingCount` על טאב `entries` — נשאר ללא שינוי.)

- [ ] **Step 2: עדכון `App.tsx`**

עדכן את שורות ה-import:

```tsx
import { useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { RdpLogo } from './components/RdpLogo'
import { usePendingEntries } from './state/useEntries'
import { useAuth } from './state/useAuth'
import { Entries } from './screens/Entries'
import { Login } from './screens/Login'
import { Settings } from './screens/Settings'
import { Summary } from './screens/Summary'
import { TaskDetail } from './screens/TaskDetail'
import { Tasks } from './screens/Tasks'
import { Today } from './screens/Today'
```

עדכן את `TAB_TITLES`:

```tsx
const TAB_TITLES: Record<Tab, string> = {
  today: 'היום',
  entries: 'דיווחים',
  tasks: 'משימות',
  summary: 'סיכום',
  settings: 'הגדרות',
}
```

הוסף state חדש בתוך `App()` (אחרי `const pending = usePendingEntries()`):

```tsx
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
```

עדכן את בלוק ה-`<main>` כך שיטפל בטאב "tasks" (כולל ניווט פנימי בין רשימה לפרטי משימה):

```tsx
      <main className="flex-1 overflow-y-auto px-4 pb-6">
        {tab === 'today' && <Today />}
        {tab === 'entries' && <Entries />}
        {tab === 'tasks' && selectedTaskId == null && <Tasks onOpenTask={setSelectedTaskId} />}
        {tab === 'tasks' && selectedTaskId != null && (
          <TaskDetail id={selectedTaskId} onBack={() => setSelectedTaskId(null)} />
        )}
        {tab === 'summary' && <Summary />}
        {tab === 'settings' && <Settings />}
      </main>
```

- [ ] **Step 2: טייפצ'ק ובנייה מלאה**

```bash
cd priority-lite
npx tsc -p client --noEmit
npm run build -w client
```
צפוי: טייפצ'ק נקי, build מצליח.

- [ ] **Step 3: Commit**

```bash
git add priority-lite/client/src/components/BottomNav.tsx priority-lite/client/src/App.tsx
git commit -m "feat(priority-lite): wire Tasks tab into navigation"
```

---

## Task 17: אימות סופי

**Files:** אין שינויים — בדיקה בלבד.

- [ ] **Step 1: טייפצ'ק מלא**

```bash
cd priority-lite
npx tsc -p shared --noEmit
npx tsc -p server --noEmit
npx tsc -p client --noEmit
```
צפוי: הכל נקי.

- [ ] **Step 2: כל הבדיקות**

```bash
cd priority-lite
npm run test -w server
npm run test -w client
```
צפוי: PASS על הכל (כולל כל הבדיקות הקיימות מלפני התוכנית הזו).

- [ ] **Step 3: build ייצור**

```bash
cd priority-lite
node scripts/vercel-build.mjs
```
צפוי: `Vercel build complete` בלי שגיאות.

- [ ] **Step 4: אימות ידני בדפדפן (preview, PRIORITY_MODE=mock)**

הרץ preview מקומי, התחבר (mock/local mode לא דורש TOTP אמיתי), ועבור על:
1. טאב "משימות" מציג רשימה (ברירת מחדל "שלי").
2. מעבר ל"הכל" מציג משימות מכמה לקוחות שונים.
3. פילטר סטטוס (למשל "לפיתוח") מצמצם את הרשימה.
4. לחיצה על משימה פותחת את מסך הפרטים.
5. שינוי סטטוס, עדיפות, ותאריך יעד — משתקפים מיד (בדוק ברענון שנשמרו).
6. פתיחת בורר "לטיפול" מציגה עובדים, בחירה מעדכנת.
7. הוספת "עדכון" לתיאור — מופיע ברשימה.
8. "היסטוריית סטטוס" נפתחת ומציגה רשומות דמה.
9. "+ משימה חדשה" מהטאב עצמו — פותח TaskPicker, יוצר משימה, חוזר לרשימה מעודכנת.

**הערה:** אימות מלא מול Priority אמיתי (PRIORITY_MODE=real) דורש session מחובר בפרודקשן (TOTP רק בטלפון המשתמש) — לא ניתן לבצע מתוך סביבת הפיתוח. זהו הדפוס הקיים בפרויקט מאז ומתמיד.

- [ ] **Step 5: עדכון ה-vault**

לפי כללי העבודה הקבועים בפרויקט (`CLAUDE.md`) — לעדכן את `vault/Meeting Notes/priority-lite-app.md`: Session Log חדש שמתעד את המימוש, הסרת/עדכון ה-Open Question של "ניהול משימות Phase 1 — 3 סיכונים טכניים" לפי מה שהתגלה בפועל ב-Task 1, ועדכון ה-Overview מ"בתכנון" ל"מומש".

- [ ] **Step 6: Commit + push סופי**

```bash
cd "C:/Users/EladShuali/Desktop/projects claude/the_five_agents"
git add "vault/Meeting Notes/priority-lite-app.md"
git commit -m "vault(priority-lite): log task management Phase 1 implementation"
git push origin main
```
