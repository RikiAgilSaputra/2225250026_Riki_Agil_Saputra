import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useApi, useInstall } from '../lib/hooks'
import type { Dashboard } from '../lib/types'
import { Avatar, Flame, Gem, Icon } from './Icon'

const STUDENT_NAV = [
  { to: '/', icon: 'home', label: 'Beranda' },
  { to: '/belajar', icon: 'book', label: 'Belajar' },
  { to: '/latihan', icon: 'pencil', label: 'Latihan' },
  { to: '/literasi', icon: 'target', label: 'Literasi' },
  { to: '/pemodel', icon: 'wand', label: 'Pemodel AI' },
  { to: '/kemajuan', icon: 'chart', label: 'Kemajuan' },
  { to: '/catatan', icon: 'note', label: 'Catatanku' },
]
const MOBILE_NAV = ['/', '/belajar', '/pemodel', '/kemajuan']

function InstallCard() {
  const { mode, install } = useInstall()
  const [showHow, setShowHow] = useState(false)
  if (mode === 'installed') return null
  return (
    <div className="promo">
      <div className="promo-head">
        <Icon name="download" /> Pasang LangkahKu
      </div>
      <p>Pasang di HP atau laptop tanpa Play Store/App Store. Bisa dibuka offline.</p>
      {mode === 'prompt' ? (
        <button className="btn small" onClick={() => void install()}>
          Pasang sekarang
        </button>
      ) : (
        <button className="btn small" onClick={() => setShowHow((v) => !v)}>
          Cara memasang
        </button>
      )}
      {showHow && (
        <p style={{ fontSize: '0.8rem' }}>
          {mode === 'ios' ? (
            <>
              iPhone/iPad: buka di <b>Safari</b>, ketuk <b>Bagikan</b> <Icon name="share" width={14} height={14} />, lalu pilih{' '}
              <b>Tambah ke Layar Utama</b>.
            </>
          ) : (
            <>
              Chrome/Edge: buka menu <b>⋮</b> lalu pilih <b>Instal aplikasi</b> / <b>Tambahkan ke layar utama</b>. Di Safari Mac:
              menu <b>File → Add to Dock</b>.
            </>
          )}
        </p>
      )}
    </div>
  )
}

export function Layout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isStudent = user?.role === 'student'
  const { data: dash, reload } = useApi<Dashboard>(isStudent ? '/dashboard' : null)

  useEffect(() => {
    setOpen(false)
    if (isStudent) void reload()
  }, [location.pathname, isStudent, reload])

  const nav = isStudent ? STUDENT_NAV : [{ to: '/guru', icon: 'users', label: 'Kelas Saya' }, { to: '/pemodel', icon: 'wand', label: 'Pemodel AI' }]

  return (
    <div className="shell">
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Navigasi utama">
        <div className="brand">
          <img src="/icons/favicon.svg" alt="" />
          <div>
            <b>LangkahKu</b>
            <small>Belajar · Latihan · Pecahkan</small>
          </div>
        </div>
        <nav className="nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <InstallCard />
        <div className="user-card">
          <Avatar name={user?.display_name ?? '?'} />
          <div>
            <b>{user?.display_name}</b>
            <small>{isStudent ? `Level ${dash?.level ?? 1}` : 'Guru'}</small>
          </div>
          <button className="link-btn" title="Pengaturan" aria-label="Pengaturan" onClick={() => navigate('/pengaturan')}>
            <Icon name="settings" />
          </button>
          <button className="link-btn" title="Keluar" aria-label="Keluar" onClick={logout}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <main className="main" onClick={() => open && setOpen(false)}>
        <header className="topbar">
          <button className="menu-btn" aria-label="Buka menu" onClick={(e) => (e.stopPropagation(), setOpen(true))}>
            <Icon name="menu" />
          </button>
          <form
            className="search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get('q')
              navigate(`/belajar?q=${encodeURIComponent(String(q ?? ''))}`)
            }}
          >
            <Icon name="search" />
            <input name="q" placeholder="Cari konsep, metode, soal..." aria-label="Cari" />
          </form>
          {isStudent && (
            <div className="top-stats" aria-label="Statistik">
              <span title="Hari beruntun">
                <Flame /> {dash?.streak ?? 0}
              </span>
              <span title="Poin">
                <Gem /> {dash?.points ?? 0}
              </span>
            </div>
          )}
        </header>
        {children ?? <Outlet />}
      </main>

      {isStudent && (
        <nav className="bottom-nav" aria-label="Navigasi bawah">
          {STUDENT_NAV.filter((n) => MOBILE_NAV.includes(n.to)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              <Icon name={n.icon} />
              {n.label.replace(' AI', '')}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
