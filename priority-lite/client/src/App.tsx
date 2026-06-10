import { useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { usePendingEntries } from './state/useEntries'
import { useAuth } from './state/useAuth'
import { Entries } from './screens/Entries'
import { Login } from './screens/Login'
import { Settings } from './screens/Settings'
import { Summary } from './screens/Summary'
import { Today } from './screens/Today'

const TAB_TITLES: Record<Tab, string> = {
  today: 'היום',
  entries: 'דיווחים',
  summary: 'סיכום',
  settings: 'הגדרות',
}

export default function App() {
  const { me, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('today')
  const pending = usePendingEntries()

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500">טוען…</div>
  }

  if (!me) return <Login />

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <header className="flex items-center justify-between px-4 pb-2 pt-5">
        <h1 className="text-xl font-bold text-slate-100">{TAB_TITLES[tab]}</h1>
        <span className="text-sm text-slate-500">שלום, {me.name}</span>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-6">
        {tab === 'today' && <Today />}
        {tab === 'entries' && <Entries />}
        {tab === 'summary' && <Summary />}
        {tab === 'settings' && <Settings />}
      </main>

      <BottomNav
        value={tab}
        onChange={setTab}
        pendingCount={(pending ?? []).filter((e) => e.status !== 'pending').length}
      />
    </div>
  )
}
