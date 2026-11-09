import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Icon } from '../components/Icon'
import { GiftArt, HeroArt } from '../components/Mascot'
import { Bar, ProgressRing, Stars } from '../components/ProgressRing'
import { useApi } from '../lib/hooks'
import type { Dashboard, ModuleSummary } from '../lib/types'

const SUBJECT_TINT = ['#E3EEFE', '#FDE8E8', '#E6F6EE', '#FFF3DD']

function moduleHref(m: ModuleSummary) {
  return `/belajar/${m.id}`
}

export function Home() {
  const { data: d, error } = useApi<Dashboard>('/dashboard')
  const navigate = useNavigate()
  if (error) return <div className="error-box">{error.message}</div>
  if (!d) return <div className="empty"><div className="spinner" /></div>
  const goal = d.daily_goal
  const cont = d.continue

  return (
    <div className="home-grid">
      <div className="stack">
        <section className="hero" aria-labelledby="greet">
          <div>
            <h1 id="greet">
              {d.greeting},
              <br />
              {d.name}! 👋
            </h1>
            <p>Satu langkah kecil hari ini, makin dekat dengan paham SPLDV!</p>
            <button className="btn hero-btn" onClick={() => navigate(moduleHref(cont))}>
              Lanjutkan {cont.title} <Icon name="arrow" />
            </button>
          </div>
          <div className="hero-art">
            <HeroArt />
          </div>
          {d.class_name && <span className="chip">🏫 {d.class_name}</span>}
        </section>

        <section>
          <div className="section-head">
            <h2>Lanjutkan Materi</h2>
            <Link to="/belajar">Lihat semua</Link>
          </div>
          <div className="continue">
            <div className="chalk" aria-hidden="true">
              <span>2x + y = 7</span>
              <span>x − y = 2</span>
              <span>3x = 9 → x = 3</span>
              <span>(3, 1) ✓</span>
            </div>
            <div>
              <h3>{cont.title}</h3>
              <p className="muted">
                {cont.kind === 'prerequisite' ? 'Prasyarat' : cont.kind === 'literacy' ? 'Literasi' : 'SPLDV'} • {cont.subtitle}
              </p>
              <div className="progress">
                <Bar value={cont.progress} />
                <b>{cont.progress}%</b>
              </div>
            </div>
            <button className="btn" onClick={() => navigate(moduleHref(cont))}>
              <Icon name="play" fill="currentColor" /> Mulai
            </button>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Bangun Keahlianmu</h2>
            <Link to="/latihan">Latihan</Link>
          </div>
          <div className="tiles">
            {d.skills.map((m) => (
              <button key={m.id} className="tile" onClick={() => navigate(moduleHref(m))}>
                <span className="tile-icon">
                  <Icon name={m.icon} />
                </span>
                <span>
                  <b>{m.title.replace('Metode ', '')}</b>
                  <small>{m.problems} latihan</small>
                </span>
                <Icon name="arrow" className="arrow" width={18} height={18} />
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Konsep Dasar</h2>
            <Link to="/belajar">Lihat semua</Link>
          </div>
          <div className="subjects">
            {[...d.prerequisites, ...d.literacy].map((m, i) => (
              <Link key={m.id} to={moduleHref(m)} className="subject">
                <span className="s-icon" style={{ background: SUBJECT_TINT[i % 4] }}>
                  <Icon name={m.icon} />
                </span>
                <span>
                  <b>{m.title}</b>
                  <br />
                  <Stars score={m.best_score ?? (m.status === 'completed' ? 100 : m.progress)} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="side-col" aria-label="Ringkasan harian">
        <section className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Sasaran Harian</h2>
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
          <section className="card">
            <div className="section-head">
              <h2 style={{ fontSize: '1.1rem' }}>Papan Kelas</h2>
              <span className="chip">Minggu ini</span>
            </div>
            <ol className="board">
              {d.board.map((r) => (
                <li key={`${r.rank}-${r.name}`} className={r.me ? 'me' : ''}>
                  <span className={`rank r${r.rank}`}>{r.rank}</span>
                  <Avatar name={r.name} />
                  <b>{r.me ? 'Kamu' : r.name}</b>
                  <span className="pts">{r.points} poin</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="card gift">
          <div className="gift-row">
            <GiftArt />
            <div>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                {d.challenge.label}
              </p>
            </div>
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
