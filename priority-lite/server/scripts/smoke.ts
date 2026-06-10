// בדיקת עשן מול פריוריטי אמיתי דרך ה-adapter.
//   npx tsx scripts/smoke.ts read            ← קריאה בלבד (בטוח)
//   npx tsx scripts/smoke.ts write <DOCNO>   ← כותב דיווח בדיקה של 0.25 שעה! רק בחברת טסט
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
const [, , cmd, docno] = process.argv

if (cmd === 'read') {
  console.log('--- searchTasks("") ---')
  const all = await adapter.searchTasks('', 5)
  for (const t of all) console.log(`  ${t.id} | ${t.name} | ${t.projectName} | ${t.status}`)

  console.log('--- searchTasks("שריג") ---')
  const hits = await adapter.searchTasks('שריג', 5)
  for (const t of hits) console.log(`  ${t.id} | ${t.name} | ${t.projectName}`)

  if (all[0]) {
    console.log(`--- getTask(${all[0].id}) ---`)
    const detail = await adapter.getTask(all[0].id)
    console.log(`  ${detail?.id} | ${detail?.name} | status=${detail?.status}`)
  }

  console.log(`--- getTimeEntries(${empId}, 2026-05-01..2026-05-31) ---`)
  const entries = await adapter.getTimeEntries(empId, '2026-05-01', '2026-05-31')
  console.log(`  סה"כ ${entries.length} דיווחים`)
  for (const e of entries.slice(0, 5)) {
    console.log(`  ${e.priorityRef} | ${e.date} | ${e.taskId} ${e.taskName} | ${e.durationMin} דק' | ${e.note ?? ''}`)
  }
} else if (cmd === 'write' && docno) {
  console.log(`כותב דיווח בדיקה: 15 דק' על ${docno} עבור ${empId}...`)
  const result = await adapter.createTimeEntry({
    priorityEmpId: empId,
    taskId: docno,
    date: new Date().toISOString().slice(0, 10),
    durationMin: 15,
    note: 'בדיקת ממשק Priority Lite — נא להתעלם',
  })
  console.log(`נוצר! priorityRef=${result.priorityRef}`)
  console.log('קורא חזרה לאימות...')
  const today = new Date().toISOString().slice(0, 10)
  const entries = await adapter.getTimeEntries(empId, today, today)
  const found = entries.find((e) => e.priorityRef === result.priorityRef)
  console.log(found ? `אומת: ${JSON.stringify(found)}` : 'אזהרה: לא נמצא בקריאה חזרה')
} else {
  console.log('שימוש: smoke.ts read | smoke.ts write <DOCNO>')
}
