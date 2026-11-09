import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Graph } from '../components/Graph'
import { Icon } from '../components/Icon'
import { MathText, VarChips } from '../components/MathText'
import { Bar } from '../components/ProgressRing'
import { api, ApiError } from '../lib/api'
import { useApi } from '../lib/hooks'
import type { AttemptView, Method, MethodCard, Problem, Step, StepResult } from '../lib/types'
import { MethodCardView, startAttempt } from './ModulePage'

type Tag = '' | 'known' | 'asked' | 'irrelevant'
const NEXT_TAG: Record<Tag, Tag> = { '': 'known', known: 'asked', asked: 'irrelevant', irrelevant: '' }
const TAG_LABEL: Record<Exclude<Tag, ''>, string> = { known: 'Diketahui', asked: 'Ditanya', irrelevant: 'Tidak diperlukan' }
const STAGE_LABEL: Record<number, string> = {
  1: 'Pahami',
  2: 'Tentukan variabel',
  3: 'Terjemahkan',
  4: 'Selesaikan',
  5: 'Tafsirkan',
  6: 'Periksa kewajaran',
  7: 'Menalar',
}
const MODE_LABEL: Record<string, string> = { worked: 'Contoh', completion: 'Lengkapi', independent: 'Mandiri' }
const KEYS = ['7', '8', '9', 'x', 'y', '(', ')', '⌫', '4', '5', '6', '+', '−', '=', '/', ',', '1', '2', '3', '0', '.', '×', ' ', 'C']

function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="keypad" aria-label="Keypad matematika">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={k === 'x' ? 'vx' : k === 'y' ? 'vy' : ''}
          onClick={() => onKey(k)}
          aria-label={k === ' ' ? 'spasi' : k === '⌫' ? 'hapus' : k === 'C' ? 'kosongkan' : k}
        >
          {k === ' ' ? '␣' : k}
        </button>
      ))}
    </div>
  )
}

function isDone(s: Step) {
  return s.status !== 'todo'
}

export function Solver() {
  const { attemptId = '' } = useParams()
  const { data, error, setData } = useApi<AttemptView>(`/attempts/${attemptId}`)
  const { data: cards } = useApi<{ items: (MethodCard & { method: Method })[] }>('/method-cards')
  const navigate = useNavigate()

  const [answer, setAnswer] = useState('')
  const [choice, setChoice] = useState<string | null>(null)
  const [tags, setTags] = useState<Record<string, Tag>>({})
  const [picked, setPicked] = useState<{ x: number; y: number } | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [suggestHint, setSuggestHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [showGraph, setShowGraph] = useState(false)
  const [showStory, setShowStory] = useState(true)
  const [result, setResult] = useState<{ score: number; bonus: number; points: number } | null>(null)
  const [explanation, setExplanation] = useState('')
  const [explained, setExplained] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const startedAt = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)

  const problem: Problem | undefined = data?.problem
  const steps = problem?.steps ?? []
  const current = steps.find((s) => !isDone(s))
  const graded = steps.filter((s) => !s.prefilled)
  const doneCount = graded.filter(isDone).length

  useEffect(() => {
    setAnswer('')
    setChoice(null)
    setPicked(null)
    setSuggestHint(false)
    startedAt.current = Date.now()
    if (current && current.check !== 'highlight_spans') inputRef.current?.focus()
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (data?.completed && !result) setResult({ score: data.score ?? 0, bonus: 0, points: data.points })
  }, [data, result])

  const hasStory = Boolean(problem?.story)
  const varsKnown = useMemo(
    () => hasStory && steps.some((s) => s.modeling_stage === 2 && isDone(s)),
    [hasStory, steps],
  )
  const systemKnown = useMemo(
    () => !hasStory || steps.filter((s) => s.modeling_stage === 3).every(isDone),
    [hasStory, steps],
  )
  const graphRelevant = Boolean(problem?.graph || problem?.method === 'graph' || steps.some((s) => s.show_graph))
  const graphVisible = (graphRelevant && (current?.show_graph || problem?.graph || problem?.method === 'graph')) || showGraph
  const card = cards?.items.find((c) => c.method === problem?.method)

  if (error) return <div className="error-box">{error.message}</div>
  if (!data || !problem) return <div className="empty"><div className="spinner" /></div>

  const patchStep = (id: string, patch: Partial<Step>) =>
    setData((d) => (d ? { ...d, problem: { ...d.problem, steps: d.problem.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) } } : d))

  const submit = async () => {
    if (!current) return
    let payload: string | Record<string, string>
    if (current.check === 'highlight_spans') payload = Object.fromEntries(Object.entries(tags).filter(([, t]) => t))
    else if (current.choices) {
      if (!choice) return
      payload = choice
    } else {
      if (!answer.trim()) return
      payload = answer
    }
    setBusy(true)
    setErr(null)
    try {
      const r = await api<StepResult>(`/attempts/${attemptId}/steps`, {
        method: 'POST',
        body: { step_id: current.id, answer: payload, duration_ms: Date.now() - startedAt.current },
      })
      setFeedback({ ok: r.correct, text: r.correct ? (r.points ? `Benar! +${r.points} poin` : 'Benar!') : r.feedback })
      setSuggestHint(r.suggest_hint)
      if (r.correct) {
        patchStep(current.id, { status: 'correct', display: r.display ?? undefined, tries: r.tries })
        if (r.completed) setResult({ score: r.score ?? 0, bonus: r.bonus ?? 0, points: (data.points ?? 0) + r.points + (r.bonus ?? 0) })
      } else {
        patchStep(current.id, { tries: r.tries })
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal mengirim jawaban.')
    } finally {
      setBusy(false)
    }
  }

  const hint = async () => {
    if (!current) return
    const r = await api<{ level: number; hints: string[] }>(`/attempts/${attemptId}/steps/${current.id}/hint`, { method: 'POST' })
    patchStep(current.id, { hints: r.hints })
    setSuggestHint(false)
  }

  const reveal = async () => {
    if (!current) return
    const r = await api<{ display: string; completed: boolean; score?: number }>(`/attempts/${attemptId}/steps/${current.id}/reveal`, {
      method: 'POST',
    })
    patchStep(current.id, { status: 'revealed', display: r.display })
    setFeedback(null)
    if (r.completed) setResult({ score: r.score ?? 0, bonus: 0, points: data.points })
  }

  const onKey = (k: string) => {
    if (k === '⌫') setAnswer((a) => a.slice(0, -1))
    else if (k === 'C') setAnswer('')
    else setAnswer((a) => a + k)
    inputRef.current?.focus()
  }

  const again = async () => {
    const template = data.template ?? (hasStory ? 'story' : problem.method)
    if (!template) return navigate(problem.module_id ? `/belajar/${problem.module_id}` : '/latihan')
    setBusy(true)
    navigate(`/soal/${await startAttempt({ template, module_id: problem.module_id })}`)
  }

  const switchMethod = async (method: Method) => {
    setBusy(true)
    navigate(`/soal/${await startAttempt({ problem_id: problem.id, method })}`, { replace: true })
  }

  const canSwitchMethod =
    problem.mode === 'independent' && problem.source === 'content' && problem.system && problem.method && graded.every((s) => !isDone(s) || s.modeling_stage !== 4)

  return (
    <div>
      <div className="solver-head">
        <button className="link-btn" onClick={() => navigate(-1)} aria-label="Kembali">
          <Icon name="back" />
        </button>
        <h1 style={{ fontSize: '1.3rem' }}>{problem.title}</h1>
        <span className="badge">{MODE_LABEL[problem.mode] ?? problem.mode}</span>
        {problem.literacy && <span className="badge">{problem.literacy.level}</span>}
        {problem.source === 'ai' && <span className="badge">dari Pemodel AI</span>}
        <span style={{ flex: 1 }} />
        {problem.method && (
          canSwitchMethod ? (
            <label className="chip">
              Metode:
              <select
                value={problem.method}
                onChange={(e) => void switchMethod(e.target.value as Method)}
                style={{ border: 0, background: 'transparent', fontWeight: 700 }}
              >
                <option value="graph">Grafik</option>
                <option value="substitution">Substitusi</option>
                <option value="elimination">Eliminasi</option>
                <option value="mixed">Campuran</option>
              </select>
            </label>
          ) : (
            <span className="chip">Metode: {problem.method_label}</span>
          )
        )}
      </div>
      <div className="progress" style={{ marginTop: 0, marginBottom: 18 }}>
        <Bar value={graded.length ? (100 * doneCount) / graded.length : 100} />
        <small>
          {doneCount}/{graded.length} langkah
        </small>
      </div>

      <div className="solver">
        <div className="stack" style={{ gap: 14 }}>
          {problem.story && (
            <section className="card story" aria-label="Cerita soal">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <b style={{ flex: 1 }}>📖 Cerita</b>
                <button className="link-btn" onClick={() => setShowStory((v) => !v)}>
                  {showStory ? 'Ciutkan' : 'Tampilkan'}
                </button>
              </div>
              {showStory && (
                <>
                  <p className="story-text">
                    {problem.story.segments.map((g) =>
                      current?.check === 'highlight_spans' ? (
                        <button
                          key={g.id}
                          type="button"
                          className={`seg ${tags[g.id] ?? ''}`}
                          onClick={() => setTags((t) => ({ ...t, [g.id]: NEXT_TAG[(t[g.id] ?? '') as Tag] }))}
                          aria-label={`${g.text} — ${tags[g.id] ? TAG_LABEL[tags[g.id] as Exclude<Tag, ''>] : 'belum ditandai'}`}
                        >
                          {g.text}
                        </button>
                      ) : (
                        <span key={g.id} className={`seg ${tags[g.id] ?? ''}`}>
                          {g.text}{' '}
                        </span>
                      ),
                    )}
                  </p>
                  {problem.story.table && (
                    <div className="table-wrap">
                      <table className="xy">
                        <tbody>
                          {problem.story.table.map((r, i) => (
                            <tr key={i}>
                              {r.map((c, j) => (
                                <td key={j}>{c}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              {varsKnown && <VarChips vars={problem.story.variables} />}
            </section>
          )}

          {problem.system_display && systemKnown && (
            <div className="system" aria-label="Sistem persamaan">
              {problem.system_display.map((e, i) => (
                <MathText key={i} as="div" text={`(${i + 1})   ${e}`} />
              ))}
            </div>
          )}

          <section className="steps" aria-label="Langkah penyelesaian">
            {steps.filter(isDone).map((s) => (
              <div key={s.id} className={`step-done ${s.status}`}>
                <Icon name={s.status === 'revealed' ? 'eye' : 'check'} className="tick" />
                <div>
                  <small className="muted">
                    {s.modeling_stage ? `${STAGE_LABEL[s.modeling_stage]} · ` : ''}
                    {s.instruction}
                  </small>
                  {s.display && <MathText as="div" text={s.display} />}
                </div>
              </div>
            ))}

            {current && !result && (
              <div className="step-card" aria-live="polite">
                <span className="step-label">
                  Langkah {graded.indexOf(current) + 1}
                  {current.modeling_stage ? ` · ${STAGE_LABEL[current.modeling_stage]}` : ''}
                </span>
                <p className="instruction" style={{ fontSize: '1.1rem' }}>
                  <MathText text={current.instruction} className="" />
                </p>

                {current.check === 'highlight_spans' ? (
                  <div className="legend">
                    Ketuk bagian cerita di atas:
                    <span className="seg known">Diketahui</span>
                    <span className="seg asked">Ditanya</span>
                    <span className="seg irrelevant">Tidak diperlukan</span>
                  </div>
                ) : current.choices ? (
                  <div className="choices" role="radiogroup">
                    {current.choices.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={choice === c.id}
                        className={`choice${choice === c.id ? ' selected' : ''}`}
                        onClick={() => setChoice(c.id)}
                      >
                        <MathText text={c.label} className="" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      void submit()
                    }}
                    style={{ display: 'grid', gap: 10 }}
                  >
                    <input
                      ref={inputRef}
                      className="answer-input"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder={current.check === 'point' ? '(x, y)' : current.check === 'value' ? `${current.variable ?? 'x'} = ...` : 'tulis persamaannya'}
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      aria-label="Jawaban"
                    />
                    <Keypad onKey={onKey} />
                  </form>
                )}

                {feedback && <div className={`feedback ${feedback.ok ? 'ok' : 'bad'}`}>{feedback.ok ? '✓' : '✗'} {feedback.text}</div>}
                {err && <div className="error-box">{err}</div>}

                {current.hints.length > 0 && (
                  <div className="hints">
                    {current.hints.map((h, k) => (
                      <div key={k} className="hint-item">
                        <b>Petunjuk {k + 1}</b>
                        <MathText text={h} className="" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="step-actions">
                  {current.hints.length < 3 && (
                    <button className={`btn hint small`} onClick={() => void hint()} style={suggestHint ? { outline: '3px solid var(--hint)' } : undefined}>
                      <Icon name="bulb" /> {current.hints.length ? 'Petunjuk lagi' : 'Petunjuk'}
                    </button>
                  )}
                  {current.tries >= 3 && (
                    <button className="link-btn" onClick={() => void reveal()}>
                      Tampilkan jawaban langkah ini
                    </button>
                  )}
                  <span className="spacer" />
                  <button className="btn" disabled={busy} onClick={() => void submit()}>
                    Cek
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div className="card result">
                <span style={{ fontSize: '2.4rem' }} aria-hidden="true">
                  {result.score >= 75 ? '🎉' : '💪'}
                </span>
                <div className="score">{result.score}</div>
                <p>
                  {result.score >= 75 ? 'Hebat, kamu menyelesaikan soal ini!' : 'Selesai! Coba soal yang mirip untuk berlatih lagi.'}
                  {result.bonus ? ` Bonus +${result.bonus} poin.` : ''}
                </p>
                {!explained ? (
                  <div className="field" style={{ width: '100%', textAlign: 'left' }}>
                    <label htmlFor="explain">Jelaskan dengan kata-katamu (boleh dilewati)</label>
                    <textarea
                      id="explain"
                      maxLength={280}
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="Misalnya: aku menghilangkan y dulu karena koefisiennya sama…"
                      style={{ minHeight: 90 }}
                    />
                    {explanation.trim() && (
                      <button
                        className="btn ghost small"
                        onClick={() =>
                          void api(`/attempts/${attemptId}/explanation`, { method: 'POST', body: { text: explanation } }).then(() => setExplained(true))
                        }
                      >
                        Simpan penjelasan
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="badge success">Penjelasan tersimpan</p>
                )}
                <div className="step-actions" style={{ justifyContent: 'center' }}>
                  <button className="btn" disabled={busy} onClick={() => void again()}>
                    🎲 Soal lain yang mirip
                  </button>
                  {problem.module_id && (
                    <Link className="btn ghost" to={`/belajar/${problem.module_id}`}>
                      Kembali ke modul
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="stack" style={{ gap: 14 }}>
          {card && (
            <button className="btn ghost block" onClick={() => setShowCard(true)}>
              📋 Kartu metode {card.name}
            </button>
          )}
          {problem.system && systemKnown && !graphVisible && (
            <button className="btn ghost block" onClick={() => setShowGraph(true)}>
              📈 Grafik bantu
            </button>
          )}
          {graphVisible && (problem.graph || (problem.system && systemKnown)) && (
            <section className="card">
              <b style={{ display: 'block', marginBottom: 8 }}>Grafik</b>
              <Graph
                lines={problem.graph?.lines ?? problem.system ?? []}
                labels={problem.graph ? undefined : problem.system_display ?? undefined}
                points={problem.graph?.points}
                showIntersection={Boolean(result)}
                pick={
                  current?.check === 'point'
                    ? {
                        value: picked,
                        onPick: (x, y) => {
                          setPicked({ x, y })
                          setAnswer(`(${x}, ${y})`)
                        },
                      }
                    : undefined
                }
              />
            </section>
          )}
          {hasStory && (
            <section className="card soft">
              <b>Siklus pemodelan</b>
              <ol style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 4 }}>
                {[1, 2, 3, 4, 5, 6].map((st) => {
                  const ss = steps.filter((s) => s.modeling_stage === st)
                  const done = ss.length > 0 && ss.every(isDone)
                  const active = current?.modeling_stage === st
                  return (
                    <li key={st} style={{ fontWeight: active ? 800 : 500, color: done ? 'var(--success)' : active ? 'var(--primary)' : undefined }}>
                      {STAGE_LABEL[st]} {done ? '✓' : ''}
                    </li>
                  )
                })}
              </ol>
            </section>
          )}
        </aside>
      </div>

      {showCard && card && (
        <div className="overlay" onClick={() => setShowCard(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Kartu metode ${card.name}`}>
            <MethodCardView card={card} method={card.method} />
            <button className="btn" onClick={() => setShowCard(false)}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
