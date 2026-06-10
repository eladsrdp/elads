// סקריפט גילוי חד-פעמי ל-M6 — שולף $metadata ורשומה לדוגמה מ-Priority
// כדי למפות שמות שדות אמיתיים. לא מדפיס credentials.
//   npx tsx scripts/discover.ts metadata   ← שומר priority-metadata.xml
//   npx tsx scripts/discover.ts sample <ENTITY> [top]
import 'dotenv/config'
import { writeFileSync } from 'node:fs'

const base = process.env.PRIORITY_BASE_URL ?? ''
const ini = process.env.PRIORITY_TABULA_INI ?? 'tabula.ini'
const company = process.env.PRIORITY_COMPANY ?? ''
const user = process.env.PRIORITY_USER ?? ''
const password = process.env.PRIORITY_PASSWORD ?? ''

if (!base || !company || !user || !password) {
  console.error('חסרים ערכים ב-.env (PRIORITY_BASE_URL/COMPANY/USER/PASSWORD)')
  process.exit(1)
}

const root = `${base.replace(/\/$/, '')}/odata/Priority/${ini}/${company}`
const auth = 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')

async function get(path: string): Promise<Response> {
  const res = await fetch(`${root}/${path}`, {
    headers: { Authorization: auth, Accept: path === '$metadata' ? 'application/xml' : 'application/json' },
  })
  console.log(`GET /${path.slice(0, 80)} → ${res.status}`)
  return res
}

const [, , cmd, entity, top] = process.argv

if (cmd === 'metadata') {
  const res = await get('$metadata')
  if (!res.ok) {
    console.error((await res.text()).slice(0, 500))
    process.exit(1)
  }
  const xml = await res.text()
  writeFileSync('priority-metadata.xml', xml, 'utf8')
  console.log(`נשמר priority-metadata.xml (${Math.round(xml.length / 1024)}KB)`)
} else if (cmd === 'sample' && entity) {
  const sep = entity.includes('?') ? '&' : '?'
  const res = await get(`${entity}${sep}$top=${top ?? 1}`)
  const text = await res.text()
  console.log(text.slice(0, 4000))
} else {
  console.log('שימוש: discover.ts metadata | discover.ts sample <ENTITY> [top]')
}
