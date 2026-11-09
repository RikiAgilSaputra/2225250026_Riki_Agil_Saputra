import { Bar } from '../components/ProgressRing'
import { Flame, Gem } from '../components/Icon'
import { useApi } from '../lib/hooks'
import type { LiteracyProfile, ModuleSummary } from '../lib/types'

const INDICATORS: [string, string][] = [
  ['merumuskan', 'Merumuskan'],
  ['menerapkan', 'Menerapkan'],
  ['menafsirkan', 'Menafsirkan'],
  ['penalaran', 'Penalaran'],
]

export function LiteracyBars({ profile }: { profile: LiteracyProfile }) {
  return (
    <div className="bars">
      {INDICATORS.map(([k, label]) => {
        const v = profile.indicators[k]
        return (
          <div key={k} className="bar-row">
            <span>{label}</span>
            <Bar value={v ?? 0} />
            <b>{v ?? '–'}</b>
          </div>
        )
      })}
    </div>
  )
}

export function Progress() {
  const { data } = useApi<{ modules: ModuleSummary[]; literacy: LiteracyProfile; points: number; streak: number }>('/progress/summary')
  if (!data) return <div className="empty"><div className="spinner" /></div>
  const done = data.modules.filter((m) => m.status === 'completed').length
  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Kemajuan</h1>
        <p className="page-sub">Lihat apa yang sudah kamu kuasai dan apa yang perlu dilatih lagi.</p>
      </div>
      <section className="card stat-grid">
        <div className="stat">
          <small className="muted">Poin</small>
          <b>
            <Gem /> {data.points}
          </b>
        </div>
        <div className="stat">
          <small className="muted">Hari beruntun</small>
          <b>
            <Flame /> {data.streak}
          </b>
        </div>
        <div className="stat">
          <small className="muted">Modul dikuasai</small>
          <b>
            {done}/{data.modules.length}
          </b>
        </div>
      </section>
      <section className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 6 }}>Profil literasi</h2>
        <p className="muted" style={{ marginBottom: 14, fontSize: '0.9rem' }}>
          Merumuskan = mengubah cerita jadi model. Menerapkan = menyelesaikan. Menafsirkan = mengembalikan ke cerita.
        </p>
        <LiteracyBars profile={data.literacy} />
      </section>
      <section className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Modul</h2>
        <div className="bars">
          {data.modules.map((m) => (
            <div key={m.id} className="bar-row" style={{ gridTemplateColumns: 'minmax(120px, 220px) 1fr 44px' }}>
              <span>{m.title}</span>
              <Bar value={m.progress} tone={m.status === 'completed' ? 'success' : undefined} />
              <b>{m.progress}%</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
