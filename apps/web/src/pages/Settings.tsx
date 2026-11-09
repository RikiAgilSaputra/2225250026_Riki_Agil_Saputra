import { api } from '../lib/api'
import { applyPreferences, useAuth } from '../lib/auth'
import type { User } from '../lib/types'

export function Settings() {
  const { user, refresh, logout } = useAuth()
  if (!user) return null
  const prefs = user.preferences ?? {}

  const update = async (patch: Partial<User['preferences']>) => {
    const me = await api<User>('/me', { method: 'PATCH', body: patch })
    applyPreferences(me.preferences)
    await refresh()
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 className="page-title">Pengaturan</h1>
      <p className="page-sub">
        {user.display_name} (@{user.username}){user.class ? ` · ${user.class.name}` : ''}
      </p>
      <section className="card">
        <label className="switch">
          Mode gelap
          <input type="checkbox" checked={prefs.dark_mode === true} onChange={(e) => void update({ dark_mode: e.target.checked })} />
        </label>
        <label className="switch">
          Teks besar
          <input type="checkbox" checked={prefs.large_text === true} onChange={(e) => void update({ large_text: e.target.checked })} />
        </label>
        <div style={{ marginTop: 16 }}>
          <button className="btn ghost" onClick={logout}>
            Keluar
          </button>
        </div>
      </section>
    </div>
  )
}
