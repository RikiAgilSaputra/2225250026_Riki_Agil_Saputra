import { useState } from 'react'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

export function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ username: '', password: '', display_name: '', join_code: '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      if (mode === 'login') await login(form.username, form.password)
      else
        await register({
          join_code: form.join_code.trim().toUpperCase(),
          display_name: form.display_name,
          username: form.username.trim().toLowerCase(),
          password: form.password,
        })
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Gagal masuk.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={(e) => void submit(e)}>
        <div className="brand" style={{ borderBottom: 0, paddingBottom: 0 }}>
          <img src="/icons/favicon.svg" alt="" />
          <div>
            <b>LangkahKu</b>
            <small>Belajar SPLDV langkah demi langkah</small>
          </div>
        </div>
        <h1 style={{ fontSize: '1.4rem' }}>{mode === 'login' ? 'Masuk' : 'Gabung ke kelas'}</h1>
        {mode === 'register' && (
          <>
            <div className="field">
              <label htmlFor="jc">Kode kelas dari guru</label>
              <input id="jc" value={form.join_code} onChange={set('join_code')} maxLength={6} required placeholder="K7Q2MX" />
            </div>
            <div className="field">
              <label htmlFor="dn">Nama panggilan</label>
              <input id="dn" value={form.display_name} onChange={set('display_name')} maxLength={40} required />
            </div>
          </>
        )}
        <div className="field">
          <label htmlFor="un">Username</label>
          <input id="un" value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="off" required />
        </div>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 6 : undefined}
            required
          />
        </div>
        {err && <div className="error-box">{err}</div>}
        <button className="btn block" disabled={busy}>
          {mode === 'login' ? 'Masuk' : 'Daftar & gabung'}
        </button>
        <button type="button" className="link-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Siswa baru? Gabung dengan kode kelas' : 'Sudah punya akun? Masuk'}
        </button>
        {mode === 'login' && (
          <div className="demo-accounts info-box">
            <b>Akun demo</b>
            <span>Siswa: siswa / siswa123</span>
            <span>Guru: guru / guru123</span>
          </div>
        )}
      </form>
    </div>
  )
}
