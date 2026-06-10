import { useEffect, useState } from 'react'
import type { ScopeId } from './types'
import { ensureSeeded } from './db/db'
import { BottomNav, type Tab } from './components/BottomNav'
import { ScopeSwitch } from './components/ScopeSwitch'
import { Dashboard } from './screens/Dashboard'
import { Ledger } from './screens/Ledger'
import { Bridge } from './screens/Bridge'
import { Settings } from './screens/Settings'

const TAB_TITLES: Record<Tab, string> = {
  dashboard: 'הדופק',
  ledger: 'ספר התנועות',
  bridge: 'גשר העברות',
  settings: 'הגדרות',
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [scope, setScope] = useState<ScopeId>('business')

  useEffect(() => {
    ensureSeeded().then(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">טוען…</div>
    )
  }

  const showScopeSwitch = tab === 'dashboard' || tab === 'ledger'

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <header className="space-y-3 px-4 pb-2 pt-5">
        <h1 className="text-xl font-bold text-slate-100">{TAB_TITLES[tab]}</h1>
        {showScopeSwitch && <ScopeSwitch value={scope} onChange={setScope} />}
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-6">
        {tab === 'dashboard' && <Dashboard scope={scope} />}
        {tab === 'ledger' && <Ledger scope={scope} />}
        {tab === 'bridge' && <Bridge />}
        {tab === 'settings' && <Settings />}
      </main>

      <BottomNav value={tab} onChange={setTab} />
    </div>
  )
}
