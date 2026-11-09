export function ProgressRing({ value, max, size = 132 }: { value: number; max: number; size?: number }) {
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  const pct = Math.min(1, max ? value / max : 0)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary-soft)" strokeWidth={10} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

export function Stars({ score }: { score: number | null }) {
  const n = score == null ? 0 : Math.round(score / 20)
  return (
    <span className="stars" aria-label={`${n} dari 5 bintang`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={i < n ? '' : 'off'}>
          ★
        </span>
      ))}
    </span>
  )
}

export function Bar({ value, tone }: { value: number; tone?: 'success' }) {
  return (
    <div className={`bar${tone ? ` ${tone}` : ''}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}
