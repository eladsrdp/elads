import { useState } from 'react'
import { TopNav, type Tab } from './components/TopNav'
import { Login } from './screens/Login'
import { OpenIssues } from './screens/OpenIssues'
import { History } from './screens/History'
import { useAuth } from './state/useAuth'

export default function App() {
  const { me, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('open')

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">טוען…</div>
  }

  if (!me) return <Login />

  return (
    <div className="min-h-screen bg-slate-900">
      <TopNav tab={tab} onChange={setTab} />
      {tab === 'open' ? <OpenIssues /> : <History />}
    </div>
  )
}
