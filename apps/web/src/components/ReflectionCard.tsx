import { useState } from 'react'
import { api, ApiError } from '../lib/api'

const EASE = ['Mudah', 'Sedang', 'Sulit'] as const

/**
 * End-of-module mediation (RMT, docs/15 §3): bridge to other contexts (transcendence) and a short
 * reflection on goal, means and self-evaluation. Optional; saved to Catatanku only when the student asks.
 */
export function ReflectionCard({ moduleId, title, bridge }: { moduleId: string; title: string; bridge: string | null }) {
  const [goal, setGoal] = useState('')
  const [ease, setEase] = useState<(typeof EASE)[number] | null>(null)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    setErr(null)
    const body = [`Tujuan langkah-langkahnya: ${goal.trim()}`, ease ? `Bagiku modul ini: ${ease}` : ''].filter(Boolean).join('\n')
    try {
      await api('/notes', { method: 'POST', body: { module_id: moduleId, title: `Refleksi: ${title}`.slice(0, 80), body } })
      setSaved(true)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal menyimpan refleksi.')
    }
  }

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      {bridge && (
        <p>
          🌉 <b>Jembatan:</b> {bridge}
        </p>
      )}
      <div className="field">
        <label htmlFor={`goal-${moduleId}`}>🪞 Refleksi: apa tujuan langkah-langkah di modul ini?</label>
        <textarea id={`goal-${moduleId}`} value={goal} maxLength={400} onChange={(e) => setGoal(e.target.value)} disabled={saved} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span className="muted">Bagiku modul ini:</span>
        {EASE.map((x) => (
          <button key={x} type="button" className={`chip ${ease === x ? 'active' : ''}`} style={{ border: 0 }} onClick={() => setEase(x)} disabled={saved}>
            {x}
          </button>
        ))}
      </div>
      {saved ? (
        <p className="muted">✓ Tersimpan di Catatanku.</p>
      ) : (
        <button className="btn ghost" style={{ justifySelf: 'start' }} disabled={goal.trim().length < 5} onClick={() => void save()}>
          Simpan ke Catatanku
        </button>
      )}
      {err && <p className="error-box">{err}</p>}
    </div>
  )
}
