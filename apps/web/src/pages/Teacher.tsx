import { api } from '../lib/api'
import { useApi } from '../lib/hooks'
import type { LiteracyProfile } from '../lib/types'
import { LiteracyBars } from './Progress'

interface Overview {
  class: {
    id: string
    name: string
    join_code: string
    settings: { ai_enabled: boolean; daily_quota: number; allow_full_solution: boolean; leaderboard_enabled: boolean }
  }
  students: {
    id: string
    name: string
    username: string
    points_week: number
    streak: number
    modules_completed: number
    avg_score: number | null
    literacy: Record<string, number | null>
  }[]
  literacy: LiteracyProfile
  hardest_steps: { problem_id: string; step_id: string; tries: number; error_rate: number }[]
  module_count: number
  submissions: { id: string; text: string; status: string; rating: number; created_at: string }[]
}

const STATUS_LABEL: Record<string, string> = {
  verified: 'Terverifikasi',
  verified_special: 'Tanpa solusi tunggal',
  unverified: 'Gagal diverifikasi',
  not_spldv: 'Bukan SPLDV',
  rejected: 'Ditolak',
}

export function Teacher() {
  const { data, reload, error } = useApi<Overview>('/teacher/overview')
  if (error) return <div className="error-box">{error.message}</div>
  if (!data) return <div className="empty"><div className="spinner" /></div>
  const s = data.class.settings

  const update = async (patch: Partial<Overview['class']['settings']>) => {
    await api(`/teacher/classes/${data.class.id}/settings`, { method: 'PATCH', body: patch })
    void reload()
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{data.class.name}</h1>
        <p className="page-sub">
          Kode kelas untuk siswa: <b style={{ fontSize: '1.2rem', letterSpacing: 2 }}>{data.class.join_code}</b>
        </p>
      </div>

      <div className="home-grid">
        <div className="stack">
          <section className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Siswa ({data.students.length})</h2>
            <div className="data-table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Poin minggu ini</th>
                    <th>Beruntun</th>
                    <th>Modul dikuasai</th>
                    <th>Skor rata-rata</th>
                    <th>Merumuskan</th>
                    <th>Menerapkan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((st) => (
                    <tr key={st.id}>
                      <td>
                        <b>{st.name}</b> <small className="muted">@{st.username}</small>
                      </td>
                      <td>{st.points_week}</td>
                      <td>{st.streak} hari</td>
                      <td>
                        {st.modules_completed}/{data.module_count}
                      </td>
                      <td>{st.avg_score ?? '–'}</td>
                      <td>{st.literacy.merumuskan ?? '–'}</td>
                      <td>{st.literacy.menerapkan ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Langkah tersulit</h2>
            {data.hardest_steps.length === 0 ? (
              <p className="muted">Belum cukup data.</p>
            ) : (
              <div className="bars">
                {data.hardest_steps.map((h) => (
                  <div key={`${h.problem_id}-${h.step_id}`} className="bar-row" style={{ gridTemplateColumns: 'minmax(140px, 220px) 1fr 50px' }}>
                    <span>
                      {h.problem_id} · {h.step_id}
                    </span>
                    <div className="bar">
                      <i style={{ width: `${h.error_rate}%`, background: 'var(--error)' }} />
                    </div>
                    <b>{h.error_rate}%</b>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Kiriman Pemodel AI</h2>
            {data.submissions.length === 0 ? (
              <p className="muted">Belum ada kiriman.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data">
                  <tbody>
                    {data.submissions.map((x) => (
                      <tr key={x.id}>
                        <td style={{ whiteSpace: 'normal', minWidth: 240 }}>{x.text}</td>
                        <td>{STATUS_LABEL[x.status] ?? x.status}</td>
                        <td>{x.rating === 1 ? '👍' : x.rating === -1 ? '👎' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="side-col">
          <section className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Profil literasi kelas</h2>
            <LiteracyBars profile={data.literacy} />
          </section>
          <section className="card">
            <h2 style={{ fontSize: '1.1rem' }}>Pengaturan kelas</h2>
            <label className="switch">
              Pemodel AI aktif
              <input type="checkbox" checked={s.ai_enabled} onChange={(e) => void update({ ai_enabled: e.target.checked })} />
            </label>
            <label className="switch">
              Izinkan penyelesaian lengkap
              <input type="checkbox" checked={s.allow_full_solution} onChange={(e) => void update({ allow_full_solution: e.target.checked })} />
            </label>
            <label className="switch">
              Papan kelas (nama panggilan)
              <input type="checkbox" checked={s.leaderboard_enabled} onChange={(e) => void update({ leaderboard_enabled: e.target.checked })} />
            </label>
            <label className="switch">
              Kuota AI per siswa/hari
              <select value={s.daily_quota} onChange={(e) => void update({ daily_quota: Number(e.target.value) })}>
                {[0, 3, 5, 10, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </aside>
      </div>
    </div>
  )
}
