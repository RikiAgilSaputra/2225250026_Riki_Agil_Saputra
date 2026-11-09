import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ApiError } from '../lib/api'
import { useApi } from '../lib/hooks'
import type { ModuleSummary } from '../lib/types'
import { ModuleCard } from './Learn'
import { startAttempt } from './ModulePage'

const TEMPLATES = [
  { id: 'graph', icon: 'graph', title: 'Grafik', sub: 'Cari titik potong' },
  { id: 'substitution', icon: 'subst', title: 'Substitusi', sub: 'Masukkan' },
  { id: 'elimination', icon: 'elim', title: 'Eliminasi', sub: 'Hilangkan' },
  { id: 'mixed', icon: 'mixed', title: 'Campuran', sub: 'Hilangkan, lalu masukkan' },
  { id: 'story', icon: 'story', title: 'Soal cerita', sub: 'Belanja, kandang hewan' },
]

export function Practice() {
  const navigate = useNavigate()
  const { data } = useApi<{ items: ModuleSummary[] }>('/modules')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const go = async (template: string) => {
    setBusy(true)
    setErr(null)
    try {
      navigate(`/soal/${await startAttempt({ template })}`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal membuat soal.')
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">Latihan</h1>
      <p className="page-sub">Soal baru dengan pola yang sama tetapi angka berbeda. Kerjakan langkah demi langkah.</p>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginBottom: 28 }}>
        {TEMPLATES.map((t) => (
          <button key={t.id} className="tile" disabled={busy} onClick={() => void go(t.id)}>
            <span className="tile-icon">
              <Icon name={t.icon} />
            </span>
            <span>
              <b>{t.title}</b>
              <small>{t.sub}</small>
            </span>
            <Icon name="arrow" className="arrow" width={18} height={18} />
          </button>
        ))}
      </div>
      {err && <p className="error-box">{err}</p>}
      <div className="section-head">
        <h2>Latihan per modul</h2>
      </div>
      <div className="module-grid">
        {data?.items.filter((m) => m.kind === 'spldv').map((m) => <ModuleCard key={m.id} m={m} />)}
      </div>
    </div>
  )
}
