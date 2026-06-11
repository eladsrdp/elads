import { useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { RdpLogo } from './components/RdpLogo'
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
      {/* ===== כותרת מותגית RDP ===== */}
      <header className="relative bg-gradient-to-l from-slate-900 to-slate-800 px-4 pt-4">
        <div className="flex items-center justify-between">
          <RdpLogo />
          <span className="text-sm text-slate-300">שלום, {me.name}</span>
        </div>
        {/* גל דגל — אקסנט ויזואלי מהבאנר */}
        <svg
          className="pointer-events-none -mx-4 mt-3 block w-[calc(100%+2rem)]"
          viewBox="0 0 400 18"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 9 Q100 1 200 9 T400 9 V18 H0 Z" fill="#1ca0e0" opacity="0.9" />
          <path d="M0 12 Q100 4 200 12 T400 12 V18 H0 Z" fill="#ffffff" opacity="0.12" />
        </svg>
      </header>

      <div className="px-4 pb-1 pt-3">
        <h1 className="text-xl text-slate-100">{TAB_TITLES[tab]}</h1>
      </div>

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
