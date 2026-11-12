import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Icon } from '../components/Icon'
import { GiftArt, HeroArt } from '../components/Mascot'
import { Bar, ProgressRing } from '../components/ProgressRing'
import { useApi } from '../lib/hooks'
import type { Dashboard, LearningPath, Method, ModuleSummary } from '../lib/types'

const METHOD_TONE: Record<Method, string> = {
  graph: 'tone-graph',
  substitution: 'tone-subst',
  elimination: 'tone-elim',
  mixed: 'tone-mixed',
}
const KIND_LABEL: Record<ModuleSummary['kind'], string> = { prerequisite: 'Prasyarat', spldv: 'SPLDV', literacy: 'Literasi' }
const STAGE_ICON: Record<string, string> = {
  prasyarat: 'calc',
  konsep: 'var',
  metode: 'mixed',
  pemodelan: 'story',
  literasi: 'reason',
  'bank-soal': 'pencil',
}

function moduleHref(m: ModuleSummary) {
  return `/belajar/${m.id}`
}

export function Home() {
  const { data: d, error } = useApi<Dashboard>('/dashboard')
  const { data: path } = useApi<LearningPath>('/learning-path')
  const navigate = useNavigate()
  if (error) return <div className="error-box">{error.message}</div>
  if (!d) return <div className="empty"><div className="spinner" /></div>
  const goal = d.daily_goal
  const cont = d.continue

  return (
    <div className="home-grid">
      <div className="stack home-main">
        <section className="hero" aria-labelledby="greet">
          <div className="hero-text">
            {d.class_name && <span className="chip hero-chip">🏫 {d.class_name}</span>}
            <h1 id="greet">
              {d.greeting},
              <br />
              {d.name}! 👋
            </h1>
            <p>Satu langkah kecil hari ini, makin dekat dengan paham SPLDV!</p>
            <button className="btn hero-btn" onClick={() => navigate(moduleHref(cont))}>
              <span className="btn-label">Lanjutkan {cont.title}</span> <Icon name="arrow" />
            </button>
          </div>
          <div className="hero-art">
            <HeroArt />
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Lanjutkan Materi</h2>
            <Link to="/belajar">Lihat jalur</Link>
          </div>
          <div className="continue">
            <div className="chalk" aria-hidden="true">
              <span>2x + y = 7</span>
              <span>x − y = 2</span>
              <span>x = 3</span>
              <span>(3, 1) ✓</span>
            </div>
            <div className="continue-body">
              <span className="badge">{KIND_LABEL[cont.kind]}</span>
              <h3>{cont.title}</h3>
              <p className="muted">{cont.subtitle}</p>
              <div className="progress">
                <Bar value={cont.progress} />
                <b>{cont.progress}%</b>
              </div>
            </div>
            <button className="btn" onClick={() => navigate(moduleHref(cont))}>
              <Icon name="play" fill="currentColor" /> {cont.progress > 0 ? 'Lanjut' : 'Mulai'}
            </button>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Bangun Keahlianmu</h2>
            <Link to="/latihan">Latihan acak</Link>
          </div>
          <div className="skill-grid">
            {d.skills.map((m) => (
              <button key={m.id} className={`skill ${m.method ? METHOD_TONE[m.method] : ''}`} onClick={() => navigate(moduleHref(m))}>
                <span className="skill-icon">
                  <Icon name={m.icon} />
                </span>
                <span className="skill-text">
                  <b>{m.title.replace('Metode ', '')}</b>
                  <small>
                    {m.problems} latihan{m.status === 'completed' ? ' · dikuasai ✓' : m.progress ? ` · ${m.progress}%` : ''}
                  </small>
                </span>
                <Icon name="arrow" className="skill-arrow" width={18} height={18} />
              </button>
            ))}
          </div>
        </section>

        {path && (
          <section>
            <div className="section-head">
              <h2>Jalur Belajar & Literasi</h2>
              <Link to="/belajar">Lihat semua</Link>
            </div>
            <div className="path-grid">
              {path.stages.map((s, i) => {
                const done = s.completed === s.modules.length
                return (
                  <Link key={s.id} to={`/belajar?tahap=${s.id}`} className={`path-card${done ? ' done' : ''}`}>
                    <span className="path-icon">
                      <Icon name={STAGE_ICON[s.id] ?? 'book'} />
                    </span>
                    <span className="path-text">
                      <small className="muted">Tahap {i + 1}</small>
                      <b>{s.title}</b>
                      <span className="path-progress">
                        <Bar value={s.progress} tone={done ? 'success' : undefined} />
                        <small className="muted">
                          {s.completed}/{s.modules.length}
                        </small>
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>

      <aside className="side-col home-side" aria-label="Ringkasan harian">
        <section className="card side-goal">
          <h2 className="side-title">Sasaran Harian</h2>
          <div className="goal">
            <div className="ring-wrap">
              <ProgressRing value={goal.minutes} max={goal.target} />
              <div className="ring-label">
                <span aria-hidden="true">🔥</span>
                <b>
                  {goal.minutes} / {goal.target}
                </b>
                <small>menit hari ini</small>
              </div>
            </div>
            <div>
              <b>{goal.minutes >= goal.target ? 'Hebat!' : 'Ayo lanjut!'}</b>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                {goal.minutes >= goal.target
                  ? 'Sasaran hari ini tercapai.'
                  : `${goal.target - goal.minutes} menit lagi untuk sasaran hari ini.`}
              </p>
            </div>
          </div>
          <div className="week">
            {goal.week.map((w) => (
              <div key={w.day}>
                <i className={w.done ? 'done' : w.active || w.is_today ? 'active' : ''}>{w.done ? '✓' : ''}</i>
                {w.label}
              </div>
            ))}
          </div>
        </section>

        {d.board && (
          <section className="card side-board">
            <div className="section-head">
              <h2 className="side-title">Papan Kelas</h2>
              <span className="chip">Minggu ini</span>
            </div>
            <ol className="board">
              {d.board.map((r) => (
                <li key={`${r.rank}-${r.name}`} className={r.me ? 'me' : ''}>
                  <span className={`rank r${r.rank}`}>{r.rank}</span>
                  <Avatar name={r.name} />
                  <b className="board-name">{r.me ? 'Kamu' : r.name}</b>
                  <span className="pts">{r.points} poin</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="card gift side-gift">
          <div className="gift-row">
            <GiftArt />
            <p className="muted" style={{ fontSize: '0.88rem' }}>
              {d.challenge.label}
            </p>
          </div>
          <div className="progress">
            <Bar value={(100 * d.challenge.done) / d.challenge.target} />
            <b>
              {d.challenge.done}/{d.challenge.target}
            </b>
          </div>
        </section>
      </aside>
    </div>
  )
}
