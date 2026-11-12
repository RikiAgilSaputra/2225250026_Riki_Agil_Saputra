import { Link } from 'react-router-dom'
import { useApi } from '../lib/hooks'
import type { ModuleSummary } from '../lib/types'
import { ModuleCard } from './Learn'

const LEVELS = [
  {
    level: 'MATERI',
    title: 'Materi Lengkap SPLDV',
    text: 'Mulai di sini: definisi, variabel, koefisien, konstanta, metode penyelesaian, sampai mengubah soal cerita menjadi model.',
  },
  { level: 'L1', title: 'L1 · Langsung', text: 'Semua informasi ada di teks. Fokus mengubah kalimat menjadi persamaan.' },
  { level: 'L2', title: 'L2 · Representasi', text: 'Informasi dalam tabel atau struk, dan ada angka yang tidak diperlukan.' },
  { level: 'L3', title: 'L3 · Penalaran', text: 'Hitung, bandingkan, lalu ambil keputusan atau nilai sebuah klaim.' },
]

const CYCLE = [
  ['1', 'Pahami', 'Tandai yang diketahui dan ditanya'],
  ['2', 'Tentukan variabel', 'x dan y mewakili apa?'],
  ['3', 'Terjemahkan', 'Kalimat → persamaan'],
  ['4', 'Selesaikan', 'Pilih metode'],
  ['5', 'Tafsirkan', 'Kembalikan ke cerita'],
  ['6', 'Periksa', 'Apakah masuk akal?'],
]

export function Literacy() {
  const { data } = useApi<{ items: ModuleSummary[] }>('/modules')
  const mods = data?.items.filter((m) => m.kind === 'literacy') ?? []
  return (
    <div>
      <h1 className="page-title">Literasi Matematika</h1>
      <p className="page-sub">Pakai SPLDV untuk memahami situasi nyata: belanja, parkir, paket kuota, dan lainnya.</p>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Siklus pemodelan</h2>
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {CYCLE.map(([n, t, s]) => (
            <div key={n} className="tile" style={{ cursor: 'default' }}>
              <span className="tile-icon" style={{ fontWeight: 800 }}>
                {n}
              </span>
              <span>
                <b>{t}</b>
                <small>{s}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      {LEVELS.map((l) => (
        <section key={l.level} style={{ marginBottom: 24 }}>
          <div className="section-head">
            <h2>{l.title}</h2>
          </div>
          <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
            {l.text}
          </p>
          <div className="module-grid">
            {mods.filter((m) => m.level === l.level).map((m) => (
              <ModuleCard key={m.id} m={m} />
            ))}
          </div>
        </section>
      ))}
      <p className="info-box">
        Punya soal cerita dari buku atau PR? Coba <Link to="/pemodel">Pemodel AI</Link> untuk melihat model matematikanya.
      </p>
    </div>
  )
}
