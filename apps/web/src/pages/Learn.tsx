import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Bar } from '../components/ProgressRing'
import { useApi } from '../lib/hooks'
import type { LearningPath, ModuleRole, ModuleSummary } from '../lib/types'

const ROLE_LABEL: Record<ModuleRole, string> = {
  inti: 'Inti',
  pendalaman: 'Pendalaman',
  ringkasan: 'Ringkasan',
  latihan: 'Bank soal',
}

const CYCLE = [
  ['1', 'Pahami', 'Tandai yang diketahui dan ditanya'],
  ['2', 'Tentukan variabel', 'x dan y mewakili apa?'],
  ['3', 'Terjemahkan', 'Kalimat → persamaan'],
  ['4', 'Selesaikan', 'Pilih metode'],
  ['5', 'Tafsirkan', 'Kembalikan ke cerita'],
  ['6', 'Periksa', 'Apakah masuk akal?'],
]

export function ModuleCard({ m, role }: { m: ModuleSummary; role?: ModuleRole }) {
  return (
    <Link to={`/belajar/${m.id}`} className={`module-card${role ? ` role-${role}` : ''}`}>
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
      <small className="muted mc-meta">
        {role && <span className={`badge role-badge ${role}`}>{ROLE_LABEL[role]}</span>}
        {m.level && m.level !== 'MATERI' && <span className="badge">{m.level}</span>}
        <span>
          {m.screens} layar · {m.problems} soal
        </span>
        {m.status === 'completed' && <span className="badge success">Dikuasai</span>}
      </small>
    </Link>
  )
}

/** Belajar & Literasi: one staged learning path that holds every module (content/path.json). */
export function Learn() {
  const { data, error } = useApi<LearningPath>('/learning-path')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = (params.get('q') ?? '').toLowerCase().trim()
  const focusStage = params.get('tahap')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const nextModule = useMemo(
    () => data?.stages.flatMap((s) => s.modules).find((m) => m.id === data.next_module_id),
    [data],
  )

  // Open the stage the student is working on (or the one asked for in ?tahap=)
  useEffect(() => {
    if (!data) return
    const current = focusStage ?? data.stages.find((s) => s.modules.some((m) => m.id === data.next_module_id))?.id
    setOpen(new Set(current ? [current] : [data.stages[0]?.id]))
    if (focusStage) requestAnimationFrame(() => document.getElementById(`tahap-${focusStage}`)?.scrollIntoView({ behavior: 'smooth' }))
  }, [data, focusStage])

  if (error) return <div className="error-box">{error.message}</div>
  if (!data) return <div className="empty"><div className="spinner" /></div>

  const matches = (m: ModuleSummary) => !q || `${m.title} ${m.subtitle}`.toLowerCase().includes(q)
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const found = data.stages.reduce((n, s) => n + s.modules.filter(matches).length, 0)

  return (
    <div>
      <h1 className="page-title">{data.title}</h1>
      <p className="page-sub">{data.description}</p>

      {q ? (
        <p className="info-box" style={{ marginBottom: 16 }}>
          Hasil pencarian “{q}”: {found} modul. <Link to="/belajar">Hapus pencarian</Link>
        </p>
      ) : (
        nextModule && (
          <section className="continue" style={{ marginBottom: 20 }}>
            <span className="tile-icon" style={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--primary)', color: '#fff' }}>
              <Icon name={nextModule.icon} />
            </span>
            <div>
              <small className="muted">Langkah berikutnya di jalurmu</small>
              <h3>{nextModule.title}</h3>
              <p className="muted">{nextModule.subtitle}</p>
            </div>
            <button className="btn" onClick={() => navigate(`/belajar/${nextModule.id}`)}>
              <Icon name="play" fill="currentColor" /> Lanjut
            </button>
          </section>
        )
      )}

      {!q && (
        <nav className="stage-overview" aria-label="Tahap belajar">
          {data.stages.map((s, i) => (
            <a
              key={s.id}
              href={`#tahap-${s.id}`}
              className={`stage-chip${s.completed === s.modules.length ? ' done' : ''}`}
              onClick={() => setOpen((o) => new Set(o).add(s.id))}
            >
              <span className="stage-no">{s.completed === s.modules.length ? '✓' : i + 1}</span>
              <span>
                <b>{s.title}</b>
                <small className="muted">
                  {s.completed}/{s.modules.length} modul
                </small>
              </span>
            </a>
          ))}
        </nav>
      )}

      <div className="stages">
        {data.stages.map((s, i) => {
          const mods = s.modules.filter(matches)
          if (!mods.length) return null
          const isOpen = Boolean(q) || open.has(s.id)
          return (
            <section key={s.id} id={`tahap-${s.id}`} className={`stage${isOpen ? ' open' : ''}${s.completed === s.modules.length ? ' done' : ''}`}>
              <button className="stage-head" aria-expanded={isOpen} onClick={() => toggle(s.id)}>
                <span className="stage-no">{s.completed === s.modules.length ? '✓' : i + 1}</span>
                <span className="stage-title">
                  <b>{s.title}</b>
                  <small className="muted">{s.description}</small>
                </span>
                <span className="stage-progress">
                  <Bar value={s.progress} tone={s.completed === s.modules.length ? 'success' : undefined} />
                  <small className="muted">
                    {s.completed}/{s.modules.length}
                  </small>
                </span>
                <Icon name="arrow" className="stage-caret" width={18} height={18} />
              </button>
              {isOpen && (
                <div className="stage-body">
                  {s.show_cycle && !q && (
                    <div className="card soft" style={{ marginBottom: 14 }}>
                      <b style={{ display: 'block', marginBottom: 10 }}>Siklus pemodelan</b>
                      <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                        {CYCLE.map(([n, t, d]) => (
                          <div key={n} className="tile" style={{ cursor: 'default', background: 'var(--surface)' }}>
                            <span className="tile-icon" style={{ fontWeight: 800 }}>
                              {n}
                            </span>
                            <span>
                              <b>{t}</b>
                              <small>{d}</small>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="module-grid">
                    {mods.map((m) => (
                      <ModuleCard key={m.id} m={m} role={m.role} />
                    ))}
                  </div>
                  {s.show_cycle && !q && (
                    <p className="info-box" style={{ marginTop: 14 }}>
                      Punya soal cerita dari buku atau PR? Coba <Link to="/pemodel">Pemodel AI</Link> untuk melihat model matematikanya.
                    </p>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
