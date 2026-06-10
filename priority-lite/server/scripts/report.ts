// דוח שעות מפריוריטי (קריאה בלבד).
//   npx tsx scripts/report.ts                ← 7 הימים האחרונים
//   npx tsx scripts/report.ts 2026-06-01 2026-06-07
import 'dotenv/config'
import { createODataAdapter } from '../src/priority/odata'

const adapter = createODataAdapter({
  baseUrl: process.env.PRIORITY_BASE_URL ?? '',
  tabulaIni: process.env.PRIORITY_TABULA_INI ?? 'tabula.ini',
  company: process.env.PRIORITY_COMPANY ?? '',
  user: process.env.PRIORITY_USER ?? '',
  password: process.env.PRIORITY_PASSWORD ?? '',
})

const empId = process.env.SMOKE_EMP ?? 'elads'
const [, , fromArg, toArg] = process.argv

const today = new Date()
const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
const iso = (d: Date) => d.toISOString().slice(0, 10)
const from = fromArg ?? iso(weekAgo)
const to = toArg ?? iso(today)

const entries = await adapter.getTimeEntries(empId, from, to)
entries.sort((a, b) => a.date.localeCompare(b.date))

const fmt = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`

console.log(`\n=== דוח שעות ${empId} — ${from} עד ${to} ===\n`)
if (entries.length === 0) {
  console.log('אין דיווחים בטווח הזה.')
} else {
  let currentDay = ''
  let dayTotal = 0
  const byProject = new Map<string, number>()
  let total = 0

  const flushDay = () => {
    if (currentDay) console.log(`  סה"כ ליום: ${fmt(dayTotal)}\n`)
  }

  for (const e of entries) {
    if (e.date !== currentDay) {
      flushDay()
      currentDay = e.date
      dayTotal = 0
      console.log(`${e.date}:`)
    }
    console.log(`  ${fmt(e.durationMin).padStart(5)}  ${e.taskId} ${e.taskName}${e.note ? ` — ${e.note}` : ''}`)
    dayTotal += e.durationMin
    total += e.durationMin
    byProject.set(e.taskName || e.taskId, (byProject.get(e.taskName || e.taskId) ?? 0) + e.durationMin)
  }
  flushDay()

  console.log('--- לפי פרויקט ---')
  for (const [name, min] of [...byProject.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${fmt(min).padStart(5)}  ${name}`)
  }
  console.log(`\nסה"כ: ${fmt(total)} (${entries.length} דיווחים)`)
}
