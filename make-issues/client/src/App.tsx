import { useAuth } from './state/useAuth'
import { Login } from './screens/Login'

export default function App() {
  const { me, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">טוען…</div>
  }

  if (!me) return <Login />

  return <div className="p-4 text-slate-100">שלום, {me.username}</div>
}
