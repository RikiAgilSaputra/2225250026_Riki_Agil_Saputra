import type { SVGProps } from 'react'

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  book: 'M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2zm16 0a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2zM7 7h2m-2 3h2m6-3h2m-2 3h2',
  pencil: 'm4 20 1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L8 19zm9.5-12.5 3 3',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H3',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m16 0v-1a3 3 0 0 0-2.5-3M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm6-6.8a3.5 3.5 0 0 1 0 6.6',
  note: 'M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 0v5h5M8 12h8m-8 4h6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm5-2 4 4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.6 7.6 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.6 7.6 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3z',
  play: 'M8 5.5v13l11-6.5z',
  arrow: 'M5 12h14m-5-6 6 6-6 6',
  back: 'M19 12H5m5-6-6 6 6 6',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  bulb: 'M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4m-4 4h11',
  download: 'M12 4v11m-5-5 5 5 5-5M5 20h14',
  share: 'M12 15V3m-4 4 4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1',
  wand: 'm4 20 11-11m2-5 .8 1.7L19.5 6l-1.7.8L17 8.5l-.8-1.7L14.5 6l1.7-.8zM19 13l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5zM8 4l.5 1 1 .5-1 .5L8 7l-.5-1-1-.5 1-.5z',
  // method / module icons
  graph: 'M4 4v16h16M7 15l4-5 3 3 5-6',
  subst: 'M7 7h10l-3-3m3 3-3 3M17 17H7l3 3m-3-3 3-3',
  elim: 'M6 6l12 12M9 4h6a2 2 0 0 1 2 2v1M4 12h4m8 0h4',
  mixed: 'M4 7h4l8 10h4M4 17h4l2-2.5M14 9.5 16 7h4m-3-3 3 3-3 3m0 4 3 3-3 3',
  calc: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 3h8v4H8zm0 7h2m2 0h2m2 0h0M8 17h2m2 0h2m2 0h0',
  balance: 'M12 4v16m-7 0h14M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zm14 0-3 6a3 3 0 0 0 6 0z',
  grid: 'M4 4h16v16H4zM4 12h16M12 4v16',
  func: 'M9 20c2 0 2.5-2 3-5l1.5-8C14 5 14.5 4 16 4M8 10h7',
  var: 'M5 7l5 10M10 7 5 17m9-10 3 5 3-5m-3 5v5',
  system: 'M4 8h16M4 16h16M8 4l-2 16',
  story: 'M5 4h11l3 3v13H5zM8 9h8m-8 4h8m-8 4h5',
  receipt: 'M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21zM9 8h6m-6 4h6m-6 4h4',
  reason: 'M9 9a3 3 0 1 1 4 2.8c-.7.3-1 1-1 1.7V14m0 3h0M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
}

export function Icon({ name, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name] ?? PATHS.spark} />
    </svg>
  )
}

export function Flame({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2c1 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.2-4 2.4-5.2.2 1.5.9 2.6 1.9 3.2C11 8.5 10.8 5 12 2z"
        fill="#F08A24"
      />
      <path d="M12 13c1.2 1.2 2.2 2.2 2.2 3.8a2.2 2.2 0 0 1-4.4 0c0-1.3.9-2.4 2.2-3.8z" fill="#FFD166" />
    </svg>
  )
}

export function Gem({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 21 7.5v9L12 22l-9-5.5v-9z" fill="#2F7FE0" />
      <path d="M12 2 21 7.5 12 12 3 7.5z" fill="#6FB0FF" />
      <path d="M12 12v10l-9-5.5v-9z" fill="#1F5FB0" />
    </svg>
  )
}

const AVATAR_COLORS = ['#F2B544', '#7C9CF0', '#F08A7E', '#6CC5A0', '#B48CF2', '#5FB4E0']

export function Avatar({ name, className = 'avatar' }: { name: string; className?: string }) {
  const code = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  const bg = AVATAR_COLORS[code % AVATAR_COLORS.length]
  return (
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label={name}>
      <circle cx="20" cy="20" r="20" fill={bg} />
      <circle cx="20" cy="16" r="7" fill="#FFE3C7" />
      <path d="M8 34c2-6 6.5-9 12-9s10 3 12 9a20 20 0 0 1-24 0z" fill="#FFFFFF" opacity="0.9" />
      <text x="20" y="19.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#5a3b1a">
        {name.slice(0, 1).toUpperCase()}
      </text>
    </svg>
  )
}
