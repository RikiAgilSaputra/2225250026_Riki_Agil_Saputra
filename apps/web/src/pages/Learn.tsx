import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Bar } from '../components/ProgressRing'
import { useApi } from '../lib/hooks'
import type { ModuleSummary } from '../lib/types'

const GROUPS: { kind: ModuleSummary['kind']; title: string; sub: string }[] = [
  { kind: 'prerequisite', title: 'Penyegaran Prasyarat', sub: 'Mulai di sini jika lupa materi dasar.' },
  { kind: 'spldv', title: 'Modul SPLDV', sub: 'Dari makna variabel sampai metode campuran.' },
  { kind: 'literacy', title: 'Jalur Literasi', sub: 'Soal cerita dari situasi nyata, L1 sampai L3.' },
]

export function ModuleCard({ m }: { m: ModuleSummary }) {
  return (
    <Link to={`/belajar/${m.id}`} className="module-card">
      <div className="mc-head">
        <span className="tile-icon" style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--primary)', color: '#fff' }}>
          <Icon name={m.icon} />
        </span>
        <div>
          <b>{m.title}</b>
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            {m.subtitle}
          </div>
        </div>
      </div>
      <div className="progress" style={{ marginTop: 0 }}>
        <Bar value={m.progress} tone={m.status === 'completed' ? 'success' : undefined} />
        <small>{m.progress}%</small>
      </div>
      <small className="muted">
        {m.screens} layar · {m.problems} soal
        {m.status === 'completed' && <span className="badge success" style={{ marginLeft: 8 }}>Dikuasai</span>}
      </small>
    </Link>
  )
}

export function Learn() {
  const { data, error } = useApi<{ items: ModuleSummary[] }>('/modules')
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').toLowerCase().trim()
  if (error) return <div className="error-box">{error.message}</div>
  if (!data) return <div className="empty"><div className="spinner" /></div>
  const items = q ? data.items.filter((m) => `${m.title} ${m.subtitle}`.toLowerCase().includes(q)) : data.items
  return (
    <div>
      <h1 className="page-title">Belajar</h1>
      <p className="page-sub">Pilih modul. Setiap layar berisi satu konsep, dan kamu yang mengatur temponya.</p>
      {q && (
        <p className="info-box" style={{ marginBottom: 16 }}>
          Hasil pencarian “{q}”: {items.length} modul. <Link to="/belajar">Hapus pencarian</Link>
        </p>
      )}
      {GROUPS.map((g) => {
        const list = items.filter((m) => m.kind === g.kind)
        if (!list.length) return null
        return (
          <section key={g.kind} style={{ marginBottom: 28 }}>
            <div className="section-head">
              <h2>{g.title}</h2>
            </div>
            <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
              {g.sub}
            </p>
            <div className="module-grid">
              {list.map((m) => (
                <ModuleCard key={m.id} m={m} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
