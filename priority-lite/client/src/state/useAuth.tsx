// הקשר ההתחברות — בודק session בעלייה, מאזין ל-401 גלובלי.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Me } from '../types'
import { UNAUTHORIZED_EVENT, api } from '../lib/api'

interface AuthState {
  me: Me | null
  loading: boolean
  login: (me: Me) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  me: null,
  loading: true,
  login: () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<Me>('/api/auth/me')
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false))

    const onUnauthorized = () => setMe(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setMe(null)
  }

  return (
    <AuthContext.Provider value={{ me, loading, login: setMe, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
