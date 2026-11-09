import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BlockView } from '../components/Blocks'
import { Icon } from '../components/Icon'
import { Bar } from '../components/ProgressRing'
import { api, ApiError } from '../lib/api'
import { useApi } from '../lib/hooks'
import type { AttemptView, Method, MethodCard, ModuleDetail } from '../lib/types'

const MODE_LABEL = { worked: 'Contoh', completion: 'Lengkapi', independent: 'Mandiri' } as const
const METHOD_COLOR: Record<Method, string> = {
  graph: 'var(--method-graph)',
  substitution: 'var(--method-subst)',
  elimination: 'var(--method-elim)',
  mixed: 'var(--method-mixed)',
}

export function MethodCardView({ card, method }: { card: MethodCard; method: Method | null }) {
  return (
    <div className="card" style={{ borderTop: `6px solid ${method ? METHOD_COLOR[method] : 'var(--primary)'}` }}>
      <h3 style={{ marginBottom: 6 }}>Kartu Metode {card.name}</h3>
      <p className="muted" style={{ marginBottom: 10 }}>
        {card.when}
      </p>
      <ol style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 6 }}>
        {card.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  )
}

export async function startAttempt(body: Record<string, unknown>): Promise<string> {
  const a = await api<AttemptView>('/attempts', { method: 'POST', body })
  return a.attempt_id
}

export function ModulePage() {
  const { moduleId = '' } = useParams()
  const { data: m, error } = useApi<ModuleDetail>(`/modules/${moduleId}`)
  const [i, setI] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const navigate = useNavigate()
  const shownAt = useRef(Date.now())

  useEffect(() => {
    if (m && i === null) setI(m.status === 'not_started' ? 0 : Math.min(m.last_screen, m.screens.length))
  }, [m, i])

  const saveProgress = (screen: number) => {
    const seconds = Math.min(600, Math.round((Date.now() - shownAt.current) / 1000))
    shownAt.current = Date.now()
    void api(`/progress/${moduleId}`, { method: 'PUT', body: { last_screen: screen, seconds } }).catch(() => undefined)
  }

  const go = async (body: Record<string, unknown>) => {
    setBusy(true)
    setErr(null)
    try {
      navigate(`/soal/${await startAttempt(body)}`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal memulai soal.')
      setBusy(false)
    }
  }

  if (error) return <div className="error-box">{error.message}</div>
  if (!m || i === null) return <div className="empty"><div className="spinner" /></div>

  const total = m.screens.length
  const inScreens = i < total
  const screen = m.screens[Math.min(i, total - 1)]

  return (
    <div className="lesson">
      <div className="lesson-top">
        <Link to="/belajar" className="link-btn" aria-label="Kembali ke daftar modul">
          <Icon name="back" />
        </Link>
        <b style={{ flex: 1 }}>{m.title}</b>
        <span className="chip">{inScreens ? `${i + 1} / ${total}` : 'Latihan'}</span>
      </div>
      <Bar value={(100 * Math.min(i + 1, total)) / total} />

      {inScreens ? (
        <section className="card screen" style={{ marginTop: 16 }} aria-live="polite">
          {i === 0 && <p className="muted">🎯 {m.objective}</p>}
          <p className="instruction">{screen.instruction}</p>
          {screen.blocks.map((b, k) => (
            <BlockView key={k} block={b} />
          ))}
          {i === 0 && m.recall.length > 0 && (
            <div className="recall">
              💡 Ingat kembali:{' '}
              {m.recall.map((r) => (
                <Link key={r.module_id} to={`/belajar/${r.module_id}`}>
                  {r.label}
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section style={{ marginTop: 16, display: 'grid', gap: 16 }}>
          {m.method_card && <MethodCardView card={m.method_card} method={m.method} />}
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Latihan bertahap</h3>
            <p className="muted" style={{ marginBottom: 14 }}>
              Lihat contoh dulu, lalu lengkapi, lalu kerjakan sendiri.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {m.problem_list.map((p, k) => (
                <button key={p.id} className="tile" disabled={busy} onClick={() => void go({ problem_id: p.id })}>
                  <span className="tile-icon" style={{ width: 38, height: 38, fontWeight: 800 }}>
                    {k + 1}
                  </span>
                  <span>
                    <b>{p.title}</b>
                    <small>
                      {MODE_LABEL[p.mode]}
                      {p.literacy ? ` · ${p.literacy.level} · ${p.literacy.context_category.replace('_', ' ')}` : ''}
                      {p.best_score != null ? ` · skor ${p.best_score}` : ''}
                    </small>
                  </span>
                  {p.best_score != null ? <span className="badge success" style={{ marginLeft: 'auto' }}>✓</span> : <Icon name="arrow" className="arrow" />}
                </button>
              ))}
              {m.template && (
                <button className="btn ghost" disabled={busy} onClick={() => void go({ template: m.template, module_id: m.id })}>
                  🎲 Soal lain yang mirip (angka berbeda)
                </button>
              )}
            </div>
            {err && <p className="error-box" style={{ marginTop: 12 }}>{err}</p>}
          </div>
        </section>
      )}

      <div className="lesson-nav">
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          <Icon name="back" /> Kembali
        </button>
        {inScreens && (
          <button
            className="btn"
            onClick={() => {
              saveProgress(i)
              setI(i + 1)
            }}
          >
            {i + 1 === total ? 'Ke latihan' : 'Lanjut'} <Icon name="arrow" />
          </button>
        )}
      </div>
      {inScreens && (
        <p style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to={`/catatan?modul=${m.id}`}>📝 Catat sesuatu dari layar ini</Link>
        </p>
      )}
    </div>
  )
}
