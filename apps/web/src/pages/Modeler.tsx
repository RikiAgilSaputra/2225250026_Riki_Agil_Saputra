import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CognitiveChip } from '../components/CognitiveChip'
import { ConcreteGraph } from '../components/ConcreteGraph'
import { ConcretePanel, EquationPicture, ObjectLegend } from '../components/ConcreteVisual'
import { Icon } from '../components/Icon'
import { MathText, prettyEquation } from '../components/MathText'
import { api, ApiError } from '../lib/api'
import { useApi } from '../lib/hooks'
import { photoToPayload } from '../lib/image'
import type { AnalyzeResult, Method, ScanResult } from '../lib/types'
import { startAttempt } from './ModulePage'

const KIND_LABEL: Record<ScanResult['kind'], string> = {
  story: 'Soal cerita',
  equations: 'SPLDV bentuk persamaan',
  other: 'Belum dikenali',
}

function MethodSelect({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  return (
    <label className="chip" style={{ justifySelf: 'start' }}>
      Metode:
      <select value={value} onChange={(e) => onChange(e.target.value as Method)} style={{ border: 0, background: 'transparent', fontWeight: 700 }}>
        <option value="mixed">Campuran</option>
        <option value="elimination">Eliminasi</option>
        <option value="substitution">Substitusi</option>
        <option value="graph">Grafik</option>
      </select>
    </label>
  )
}

// RMT inquiry cycle (Kinard & Kozulin, ch. 6): the app's part ends at representation; the solver does the rest
const CYCLE = ['Orientasi', 'Representasi', 'Manipulasi', 'Validasi']

const EXAMPLES = [
  'Harga 2 buku dan 3 pensil Rp19.000. Harga 1 buku dan 2 pensil Rp11.000. Berapa harga 1 buku?',
  'Di kandang ada ayam dan kambing sebanyak 30 ekor. Jumlah kakinya 80. Berapa banyak kambing?',
  'Umur ayah sekarang 3 kali umur anaknya. Lima tahun lagi, jumlah umur mereka 58 tahun. Berapa umur ayah sekarang?',
]

interface Quota {
  enabled: boolean
  daily_quota: number
  remaining: number
  max_chars: number
  allow_full_solution: boolean
}

export function Modeler() {
  const { data: quota, reload } = useApi<Quota>('/modeler/quota')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'photo' | 'scan' | 'model' | null>(null)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [res, setRes] = useState<AnalyzeResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [method, setMethod] = useState<Method>('mixed')
  const [rated, setRated] = useState<number | null>(null)
  const [guess, setGuess] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [showGraph, setShowGraph] = useState(false)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const run = async (p: 'photo' | 'scan' | 'model', fn: () => Promise<void>, fallback: string) => {
    setBusy(true)
    setPhase(p)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback)
    } finally {
      setBusy(false)
      setPhase(null)
    }
  }

  const editText = (t: string) => {
    setText(t)
    // The detection belongs to the text it was made from
    setScan(null)
    setRes(null)
    setRevealed(false)
    setShowGraph(false)
  }

  const scanText = () =>
    run('scan', async () => {
      setRes(null)
      setScan(await api<ScanResult>('/modeler/scan', { method: 'POST', body: { text } }))
    }, 'Gagal memindai soal.')

  const scanPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // the same photo can be chosen again
    if (!file) return
    void run('photo', async () => {
      setRes(null)
      setScan(null)
      const image = await photoToPayload(file)
      const s = await api<ScanResult>('/modeler/scan', { method: 'POST', body: { image } })
      setText(s.text)
      setScan(s)
      void reload()
    }, 'Gagal membaca foto.')
  }

  const analyze = () =>
    run('model', async () => {
      setRated(null)
      setRevealed(false)
      setRes(await api<AnalyzeResult>('/modeler/analyze', { method: 'POST', body: { text } }))
      void reload()
    }, 'Gagal memproses soal.')

  const startSystem = (worked = false) =>
    run('model', async () => {
      if (!scan?.system) return
      navigate(`/soal/${await startAttempt({ system: scan.system, method, ...(worked ? { mode: 'worked' } : {}) })}`)
    }, 'Gagal memulai.')

  const start = async (mode: 'guided' | 'model_only' | 'worked') => {
    if (!res) return
    setBusy(true)
    try {
      navigate(`/soal/${await startAttempt({ submission_id: res.submission_id, mode, method })}`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal memulai.')
      setBusy(false)
    }
  }

  const rate = async (r: number) => {
    if (!res) return
    setRated(r)
    await api(`/modeler/${res.submission_id}/rating`, { method: 'POST', body: { rating: r } }).catch(() => undefined)
  }

  if (quota && !quota.enabled) {
    return (
      <div>
        <h1 className="page-title">Pemodel Soal Cerita</h1>
        <p className="info-box">
          Pemodel AI belum diaktifkan gurumu. Kamu tetap bisa berlatih memodelkan sendiri di <Link to="/belajar?tahap=pemodelan">Belajar & Literasi → Pemodelan Soal Cerita</Link>.
        </p>
      </div>
    )
  }

  const m = res?.model
  // The model lists variables by symbol; the pictures need them as x and y
  const mvars = m
    ? { x: m.variables.find((v) => v.symbol === 'x') ?? m.variables[0], y: m.variables.find((v) => v.symbol === 'y') ?? m.variables[1] }
    : undefined
  const stage = !scan ? 0 : scan.kind === 'equations' || m ? 2 : 1
  return (
    <div style={{ maxWidth: 880 }}>
      <h1 className="page-title">Pemodel Soal Cerita</h1>
      <p className="page-sub">Foto atau tempel soal. Aplikasi mengenali jenisnya dulu, lalu kamu menyelesaikannya langkah demi langkah.</p>
      <div className="rmt-cycle" aria-label="Siklus berpikir">
        {CYCLE.map((c, i) => (
          <span key={c} className={`chip${i === stage ? ' on' : i < stage ? ' done' : ''}`}>
            {i < stage ? '✓ ' : `${i + 1}. `}
            {c}
          </span>
        ))}
      </div>

      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="scan-actions">
          <button className="btn ghost" disabled={busy} onClick={() => cameraInput.current?.click()}>
            <Icon name="camera" /> Foto soal
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => galleryInput.current?.click()}>
            <Icon name="image" /> Pilih gambar
          </button>
          {/* capture="environment" opens the back camera on phones; the other input opens the gallery */}
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={scanPhoto} />
          <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={scanPhoto} />
        </div>
        <div className="field">
          <label htmlFor="soal">Teks soal</label>
          <textarea
            id="soal"
            value={text}
            maxLength={quota?.max_chars ?? 1000}
            onChange={(e) => editText(e.target.value)}
            placeholder="Contoh: Harga 2 buku dan 3 pensil Rp19.000…  atau  2x + y = 7 dan x − y = 2"
          />
          <small className="muted" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>🧭 Orientasi: baca dulu, apa yang diketahui dan apa yang ditanya?</span>
          </small>
          <small className="muted" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>⚠️ Jangan tulis atau memotret nama lengkap, alamat, atau nomor HP.</span>
            <span>
              {text.length}/{quota?.max_chars ?? 1000}
            </span>
          </small>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXAMPLES.map((e, i) => (
            <button key={i} className="chip" onClick={() => editText(e)} style={{ border: 0 }}>
              Contoh {i + 1}
            </button>
          ))}
        </div>
        <div className="step-actions">
          <small className="muted">Sisa kuota hari ini: {quota?.remaining ?? '…'}</small>
          <span className="spacer" />
          <button className="btn" disabled={busy || text.trim().length === 0} onClick={() => void scanText()}>
            <Icon name="scan" /> {phase === 'scan' ? 'Memindai…' : 'Pindai soal'}
          </button>
        </div>
        {err && <div className="error-box">{err}</div>}
      </section>

      {phase === 'photo' && (
        <div className="empty">
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          Sedang membaca foto soalmu…
        </div>
      )}

      {scan && (
        <section className={`card scan-result ${scan.kind}`} style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.2rem', flex: 1 }}>Hasil pindai</h2>
            <span className={`badge ${scan.kind === 'other' ? '' : 'success'}`}>{KIND_LABEL[scan.kind]}</span>
          </div>
          <p>{scan.message}</p>
          {scan.source === 'image' && scan.text && (
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              ⓘ Teks di kotak atas adalah hasil baca foto. Periksa angkanya dulu; perbaiki bila ada yang salah.
            </p>
          )}
          {scan.kind === 'story' && !res && (
            <button className="btn" disabled={busy || text.trim().length < 20} onClick={() => void analyze()} style={{ justifySelf: 'start' }}>
              <Icon name="wand" /> {phase === 'model' ? 'Sedang membuat model…' : 'Buat model'}
            </button>
          )}
          {scan.kind === 'equations' && scan.equations && (
            <>
              {scan.equations.map((e, i) => (
                <MathText key={i} as="div" text={`${prettyEquation(e)}   (${i + 1})`} />
              ))}
              <ConcretePanel equations={scan.equations} stage="equations" open={false} />
              {scan.solvable &&
                (showGraph ? (
                  <ConcreteGraph equations={scan.equations} />
                ) : (
                  <button className="btn ghost" style={{ justifySelf: 'start' }} onClick={() => setShowGraph(true)}>
                    📈 Lihat grafik
                  </button>
                ))}
              {scan.solvable && (
                <>
                  <MethodSelect value={method} onChange={setMethod} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button className="btn" disabled={busy} onClick={() => void startSystem()}>
                      Kerjakan langkah demi langkah
                    </button>
                    {quota?.allow_full_solution && (
                      <button className="btn ghost" disabled={busy} onClick={() => void startSystem(true)}>
                        Tunjukkan penyelesaian lengkap
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}

      {phase === 'model' && !res && scan?.kind === 'story' && (
        <div className="empty">
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          Sedang membaca soalmu dan memeriksa modelnya…
        </div>
      )}

      {res && !m && (
        <section className="card" style={{ marginTop: 18 }}>
          <p className="info-box">{res.message}</p>
          {res.reason && <p className="muted" style={{ marginTop: 8 }}>{res.reason}</p>}
        </section>
      )}

      {m && !revealed && (
        <section className="card" style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          <h2 style={{ fontSize: '1.2rem' }}>Coba dulu sebelum melihat model</h2>
          <CognitiveChip id="labeling" />
          <div>
            <small className="muted">Benda dalam cerita:</small>
            <ObjectLegend vars={mvars!} tagged={false} />
          </div>
          <div className="field">
            <label htmlFor="guess">Menurutmu, x dan y mewakili apa? (boleh dilewati)</label>
            <textarea id="guess" maxLength={200} value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="x = harga 1 buku, y = …" style={{ minHeight: 70 }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button className="btn" onClick={() => setRevealed(true)}>
              Lihat model dan bandingkan
            </button>
            {res?.status !== 'verified_special' && res?.allowed_modes?.includes('worked') && (
              <button className="btn ghost" disabled={busy} onClick={() => void start('worked')}>
                Tunjukkan penyelesaian lengkap
              </button>
            )}
          </div>
        </section>
      )}

      {m && revealed && (
        <section className="card" style={{ marginTop: 18, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.2rem', flex: 1 }}>Model Matematika</h2>
            {res?.cached && <span className="chip">tersimpan</span>}
          </div>
          <CognitiveChip id="encoding" />
          {guess.trim() && (
            <p className="muted">
              <b>Tebakanmu:</b> {guess.trim()}. Bandingkan dengan model di bawah: apa yang sama, apa yang berbeda?
            </p>
          )}
          <ObjectLegend vars={mvars!} tagged />
          {m.equations.map((e, i) => (
            <div key={i} className="step-done" style={{ display: 'grid', gap: 4 }}>
              <span className="quote" style={{ fontSize: '0.95rem' }}>
                “{e.source_text}”
              </span>
              <MathText as="div" text={`→ ${prettyEquation(e.equation)}   (${i + 1})`} />
              <EquationPicture eq={e.equation} vars={mvars!} />
            </div>
          ))}
          <p>
            <b>Ditanya:</b> {m.target_label}
          </p>
          {showGraph ? (
            <ConcreteGraph equations={m.equations.map((e) => e.equation)} vars={mvars} />
          ) : (
            <button className="btn ghost" style={{ justifySelf: 'start' }} onClick={() => setShowGraph(true)}>
              📈 Lihat grafik dan gambar benda
            </button>
          )}
          {res?.status === 'verified_special' ? (
            <p className="info-box">{res.message}</p>
          ) : (
            <>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                ⓘ Model dibuat oleh AI dan sudah dibuktikan aplikasi. Penyelesaiannya dihitung aplikasi, bukan AI. Di akhir, kamu membuktikan jawabannya sendiri.
              </p>
              <MethodSelect value={method} onChange={setMethod} />
              <div style={{ display: 'grid', gap: 10 }}>
                <button className="btn" disabled={busy} onClick={() => void start('guided')}>
                  Bantu aku langkah demi langkah
                </button>
                <button className="btn ghost" disabled={busy} onClick={() => void start('model_only')}>
                  Aku selesaikan sendiri dari model ini
                </button>
                {res?.allowed_modes?.includes('worked') && (
                  <button className="btn ghost" disabled={busy} onClick={() => void start('worked')}>
                    Tunjukkan penyelesaian lengkap (dari tahap awal sampai bukti)
                  </button>
                )}
              </div>
            </>
          )}
          <div className="step-actions">
            <span className="muted">Model ini benar?</span>
            <button className={`btn small ${rated === 1 ? '' : 'ghost'}`} onClick={() => void rate(1)} aria-label="Benar">
              👍
            </button>
            <button className={`btn small ${rated === -1 ? '' : 'ghost'}`} onClick={() => void rate(-1)} aria-label="Salah">
              👎
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
