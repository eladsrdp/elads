import { useEffect, useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { BrandMark } from './components/RdpLogo'
import { usePendingEntries } from './state/useEntries'
import { useAuth } from './state/useAuth'
import { Entries } from './screens/Entries'
import { Login } from './screens/Login'
import { MyItems } from './screens/MyItems'
import { Settings } from './screens/Settings'
import { Summary } from './screens/Summary'
import { TaskDetail } from './screens/TaskDetail'
import { Tasks } from './screens/Tasks'
import { Today } from './screens/Today'

const TAB_TITLES: Record<Tab, string> = {
  today: 'היום',
  entries: 'דיווחים',
  tasks: 'משימות',
  mine: 'שלי',
  summary: 'סיכום',
  settings: 'הגדרות',
}

export default function App() {
  const { me, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('today')
  const pending = usePendingEntries()
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  // SECURITY: מאפסים ניווט פנימי (טאב + משימה נבחרת) בכל שינוי זהות משתמש —
  // כולל logout (me הופך ל-null) — כדי שלא יישאר בזיכרון state של משתמש קודם
  // (למשל taskId שנצפה) אם מישהו אחר יתחבר על אותו דפדפן בלי רענון עמוד.
  useEffect(() => {
    setTab('today')
    setSelectedTaskId(null)
  }, [me?.phone])

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500">טוען…</div>
  }

  if (!me) return <Login />

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      {/* כותרת קומפקטית: סמל + כותרת המסך + שם המשתמש. מכבדת את אזור ה-notch ב-PWA. */}
      <header
        className="flex items-center gap-3 border-b border-slate-800 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <BrandMark size={28} />
        <h1 className="flex-1 truncate text-xl text-slate-100">{TAB_TITLES[tab]}</h1>
        <span className="max-w-[40%] truncate text-sm text-slate-400">{me.name}</span>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {tab === 'today' && <Today />}
        {tab === 'entries' && <Entries />}
        {tab === 'tasks' && selectedTaskId == null && <Tasks onOpenTask={setSelectedTaskId} />}
        {tab === 'tasks' && selectedTaskId != null && (
          <TaskDetail id={selectedTaskId} onBack={() => setSelectedTaskId(null)} />
        )}
        {tab === 'mine' && <MyItems />}
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
