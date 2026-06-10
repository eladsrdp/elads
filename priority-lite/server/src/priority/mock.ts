// Adapter מדומה — מאפשר פיתוח ובדיקות מלאות לפני חיבור לפריוריטי אמיתי.
// מדמה latency של רשת וכשלים אקראיים (MOCK_FAIL_RATE) לבדיקת UI של שגיאות.
import type { RemoteTimeEntry, TaskDetail } from '@priority-lite/shared'
import type { NewTimeEntry, PriorityAdapter } from './adapter'

const PROJECTS = [
  { id: 'P-100', name: 'הטמעת CRM ללקוח אלפא' },
  { id: 'P-200', name: 'שדרוג מערך לוגיסטיקה' },
  { id: 'P-300', name: 'פיתוח פורטל ספקים' },
  { id: 'P-400', name: 'תחזוקה שוטפת' },
  { id: 'P-500', name: 'הדרכות והטמעה' },
]

function task(
  id: string,
  name: string,
  projIdx: number,
  status: string,
  description?: string,
): TaskDetail {
  return {
    id,
    name,
    projectId: PROJECTS[projIdx].id,
    projectName: PROJECTS[projIdx].name,
    status,
    description,
    openDate: '2026-05-01',
    owner: 'אלעד',
    hoursReported: Math.round(Math.random() * 40),
  }
}

const TASKS: TaskDetail[] = [
  task('T-1001', 'אפיון תהליך מכירות', 0, 'פתוחה', 'מיפוי תהליך המכירות הקיים והגדרת שלבי ה-pipeline החדשים'),
  task('T-1002', 'הגדרת שדות מותאמים', 0, 'פתוחה'),
  task('T-1003', 'מיגרציית נתוני לקוחות', 0, 'בעבודה', 'העברת 12,000 רשומות לקוח מהמערכת הישנה'),
  task('T-1004', 'בדיקות קבלה עם הלקוח', 0, 'ממתינה'),
  task('T-1005', 'ממשק WMS למחסן מרכזי', 1, 'בעבודה', 'חיבור מערכת ניהול המחסן לפריוריטי'),
  task('T-1006', 'אופטימיזציית מסלולי הפצה', 1, 'פתוחה'),
  task('T-1007', 'דוחות מלאי בזמן אמת', 1, 'פתוחה'),
  task('T-1008', 'עיצוב מסכי פורטל', 2, 'בעבודה'),
  task('T-1009', 'מנגנון הרשאות ספקים', 2, 'פתוחה', 'הגדרת רמות גישה שונות לספקים בפורטל'),
  task('T-1010', 'API הזמנות רכש', 2, 'בעבודה'),
  task('T-1011', 'בדיקות אבטחה לפורטל', 2, 'ממתינה'),
  task('T-1012', 'טיפול בתקלות שוטפות', 3, 'פתוחה', 'משימת מסגרת לתקלות יומיומיות'),
  task('T-1013', 'עדכוני גרסה רבעוניים', 3, 'פתוחה'),
  task('T-1014', 'גיבויים ושחזורים', 3, 'פתוחה'),
  task('T-1015', 'ניטור ביצועי מערכת', 3, 'בעבודה'),
  task('T-1016', 'הדרכת צוות כספים', 4, 'ממתינה'),
  task('T-1017', 'הדרכת מנהלי פרויקטים', 4, 'פתוחה'),
  task('T-1018', 'הכנת חומרי הדרכה', 4, 'בעבודה', 'מצגות ומדריכים מוקלטים לכל מודול'),
  task('T-1019', 'ליווי משתמשים חדשים', 4, 'פתוחה'),
  task('T-1020', 'סדנת דוחות מתקדמים', 4, 'ממתינה'),
]

export function createMockAdapter(opts: { failRate?: number } = {}): PriorityAdapter {
  const failRate = opts.failRate ?? 0
  const entries: (RemoteTimeEntry & { empId: string })[] = []
  let refCounter = 1000
  let taskCounter = 2000

  async function simulate(op: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 350))
    if (Math.random() < failRate) {
      throw new Error(`Priority (mock): שגיאה זמנית ב"${op}" — נסה שוב`)
    }
  }

  return {
    async searchTasks(q, limit = 20) {
      await simulate('חיפוש משימות')
      const needle = q.trim()
      const hits = needle
        ? TASKS.filter(
            (t) =>
              t.name.includes(needle) ||
              t.projectName.includes(needle) ||
              t.id.includes(needle),
          )
        : TASKS
      return hits.slice(0, limit).map(({ description: _d, ...summary }) => summary)
    },

    async getTask(id) {
      await simulate('שליפת משימה')
      return TASKS.find((t) => t.id === id) ?? null
    },

    async createTask(input) {
      await simulate('יצירת משימה')
      const project = PROJECTS.find((p) => p.id === input.projectId)
      if (!project) throw new Error(`Priority (mock): פרויקט ${input.projectId} לא נמצא`)
      const created = task(`T-${++taskCounter}`, input.name, PROJECTS.indexOf(project), 'פתוחה', input.description)
      TASKS.push(created)
      const { description: _d, ...summary } = created
      return summary
    },

    async createTimeEntry(entry: NewTimeEntry) {
      await simulate('דיווח שעות')
      const t = TASKS.find((x) => x.id === entry.taskId)
      if (!t) throw new Error(`Priority (mock): משימה ${entry.taskId} לא נמצאה`)
      const priorityRef = `LD-${++refCounter}`
      entries.push({
        priorityRef,
        empId: entry.priorityEmpId,
        taskId: entry.taskId,
        taskName: t.name,
        projectName: t.projectName,
        date: entry.date,
        durationMin: entry.durationMin,
        note: entry.note,
      })
      return { priorityRef }
    },

    async getTimeEntries(priorityEmpId, from, to) {
      await simulate('שליפת דיווחים')
      return entries
        .filter((e) => e.empId === priorityEmpId && e.date >= from && e.date <= to)
        .map(({ empId: _e, ...rest }) => rest)
    },
  }
}
