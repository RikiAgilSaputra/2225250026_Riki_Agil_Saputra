import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (body: { join_code: string; display_name: string; username: string; password: string }) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function applyPreferences(prefs: User['preferences'] | undefined) {
  const root = document.documentElement
  if (prefs?.dark_mode === true) root.dataset.theme = 'dark'
  else if (prefs?.dark_mode === false) root.dataset.theme = 'light'
  else delete root.dataset.theme
  if (prefs?.large_text) root.dataset.text = 'large'
  else delete root.dataset.text
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setLoading(false)
      return
    }
    try {
      const me = await api<User>('/me')
      setUser(me)
      applyPreferences(me.preferences)
    } catch {
      /* keep the token when offline; a 401 clears it via the handler */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    void refresh()
  }, [logout, refresh])

  const finish = (data: { access_token: string; user: User }) => {
    tokenStore.set(data.access_token)
    setUser(data.user)
    applyPreferences(data.user.preferences)
  }

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      logout,
      refresh,
      login: async (username, password) => {
        finish(await api('/auth/login', { method: 'POST', body: { username, password } }))
      },
      register: async (body) => {
        finish(await api('/auth/register-student', { method: 'POST', body }))
      },
    }),
    [user, loading, logout, refresh],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
