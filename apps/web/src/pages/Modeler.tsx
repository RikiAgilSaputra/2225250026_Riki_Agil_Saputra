import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { MathText, prettyEquation } from '../components/MathText'
import { api, ApiError } from '../lib/api'
import { useApi } from '../lib/hooks'
import type { AnalyzeResult, Method } from '../lib/types'
import { startAttempt } from './ModulePage'

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
  const [res, setRes] = useState<AnalyzeResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [method, setMethod] = useState<Method>('mixed')
  const [rated, setRated] = useState<number | null>(null)
  const navigate = useNavigate()

  const analyze = async () => {
    setBusy(true)
    setErr(null)
    setRes(null)
    setRated(null)
    try {
      setRes(await api<AnalyzeResult>('/modeler/analyze', { method: 'POST', body: { text } }))
      void reload()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal memproses soal.')
    } finally {
      setBusy(false)
    }
  }

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
          Pemodel AI belum diaktifkan gurumu. Kamu tetap bisa berlatih memodelkan sendiri di <Link to="/literasi">Jalur Literasi</Link>.
        </p>
      </div>
    )
  }

  const m = res?.model
  return (
    <div style={{ maxWidth: 880 }}>
      <h1 className="page-title">Pemodel Soal Cerita</h1>
      <p className="page-sub">Tempel soal cerita SPLDV. Aplikasi mengubahnya menjadi model matematika, lalu kamu menyelesaikannya langkah demi langkah.</p>

      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="field">
          <label htmlFor="soal">Soal cerita</label>
          <textarea
            id="soal"
            value={text}
            maxLength={quota?.max_chars ?? 1000}
            onChange={(e) => setText(e.target.value)}
            placeholder="Contoh: Harga 2 buku dan 3 pensil Rp19.000…"
          />
          <small className="muted" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>⚠️ Jangan tulis nama lengkap, alamat, atau nomor HP.</span>
            <span>
              {text.length}/{quota?.max_chars ?? 1000}
            </span>
          </small>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXAMPLES.map((e, i) => (
            <button key={i} className="chip" onClick={() => setText(e)} style={{ border: 0 }}>
              Contoh {i + 1}
            </button>
          ))}
        </div>
        <div className="step-actions">
          <small className="muted">Sisa kuota hari ini: {quota?.remaining ?? '…'}</small>
          <span className="spacer" />
          <button className="btn" disabled={busy || text.trim().length < 20} onClick={() => void analyze()}>
            <Icon name="wand" /> {busy && !res ? 'Sedang membaca soalmu…' : 'Buat model'}
          </button>
        </div>
        {err && <div className="error-box">{err}</div>}
      </section>

      {busy && !res && (
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

      {m && (
        <section className="card" style={{ marginTop: 18, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.2rem', flex: 1 }}>Model Matematika</h2>
            {res?.cached && <span className="chip">tersimpan</span>}
          </div>
          <div className="var-chips">
            {m.variables.map((v) => (
              <span key={v.symbol} className={`var-chip ${v.symbol}`}>
                <b>{v.symbol}</b> = {v.meaning} ({v.unit})
              </span>
            ))}
          </div>
          {m.equations.map((e, i) => (
            <div key={i} className="step-done" style={{ display: 'grid', gap: 4 }}>
              <span className="quote" style={{ fontSize: '0.95rem' }}>
                “{e.source_text}”
              </span>
              <MathText as="div" text={`→ ${prettyEquation(e.equation)}   (${i + 1})`} />
            </div>
          ))}
          <p>
            <b>Ditanya:</b> {m.target_label}
          </p>
          {res?.status === 'verified_special' ? (
            <p className="info-box">{res.message}</p>
          ) : (
            <>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                ⓘ Model dibuat otomatis oleh AI dan sudah diperiksa. Penyelesaiannya dihitung aplikasi, bukan AI.
              </p>
              <label className="chip" style={{ justifySelf: 'start' }}>
                Metode:
                <select value={method} onChange={(e) => setMethod(e.target.value as Method)} style={{ border: 0, background: 'transparent', fontWeight: 700 }}>
                  <option value="mixed">Campuran</option>
                  <option value="elimination">Eliminasi</option>
                  <option value="substitution">Substitusi</option>
                  <option value="graph">Grafik</option>
                </select>
              </label>
              <div style={{ display: 'grid', gap: 10 }}>
                <button className="btn" disabled={busy} onClick={() => void start('guided')}>
                  Bantu aku langkah demi langkah
                </button>
                <button className="btn ghost" disabled={busy} onClick={() => void start('model_only')}>
                  Aku selesaikan sendiri dari model ini
                </button>
                {res?.allowed_modes?.includes('worked') && (
                  <button className="btn ghost" disabled={busy} onClick={() => void start('worked')}>
                    Tunjukkan penyelesaian lengkap
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
