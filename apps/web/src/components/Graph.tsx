import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { prettyEquation } from './MathText'

/** Parse "a*x + b*y = c" style strings (also "(2)*x + (-1)*y = 3") into {a, b, c}. */
export function parseLine(eq: string): { a: number; b: number; c: number } | null {
  const [lhs, rhs] = eq.replace(/\s+/g, '').replace(/−/g, '-').split('=')
  if (rhs === undefined) return null
  const coef = (side: string, v: 'x' | 'y') => {
    let total = 0
    const re = new RegExp(`([+-]?)\\(?([+-]?\\d*\\.?\\d*)\\)?\\*?${v}`, 'g')
    for (const m of side.matchAll(re)) {
      const sign = m[1] === '-' ? -1 : 1
      const raw = m[2]
      const n = raw === '' || raw === '+' ? 1 : raw === '-' ? -1 : Number(raw)
      total += sign * n
    }
    return total
  }
  const constant = (side: string) => {
    const cleaned = side.replace(/[+-]?\(?[+-]?\d*\.?\d*\)?\*?[xy]/g, '')
    if (!cleaned) return 0
    return cleaned.match(/[+-]?\d+(\.\d+)?/g)?.reduce((s, n) => s + Number(n), 0) ?? 0
  }
  const a = coef(lhs, 'x') - coef(rhs, 'x')
  const b = coef(lhs, 'y') - coef(rhs, 'y')
  const c = constant(rhs) - constant(lhs)
  if (a === 0 && b === 0) return null
  return { a, b, c }
}

const COLORS = ['var(--var-x)', 'var(--var-y)']

interface Props {
  lines: string[]
  points?: { x: number; y: number; label?: string }[]
  /** Interactive mode: student drags a point that snaps to whole numbers. */
  pick?: { onPick: (x: number, y: number) => void; value: { x: number; y: number } | null }
  showIntersection?: boolean
  labels?: string[]
}

export function Graph({ lines, points = [], pick, showIntersection = false, labels }: Props) {
  const parsed = useMemo(() => lines.map(parseLine).filter((l): l is NonNullable<typeof l> => l !== null), [lines])

  // Choose a view window that contains the intercepts and the given points.
  const span = useMemo(() => {
    let m = 6
    const pts = [...points]
    for (const l of parsed) {
      if (l.b !== 0) pts.push({ x: 0, y: l.c / l.b })
      if (l.a !== 0) pts.push({ x: l.c / l.a, y: 0 })
    }
    if (parsed.length === 2) {
      const [p, q] = parsed
      const det = p.a * q.b - q.a * p.b
      if (det !== 0) pts.push({ x: (p.c * q.b - q.c * p.b) / det, y: (p.a * q.c - q.a * p.c) / det })
    }
    for (const p of pts) m = Math.max(m, Math.abs(p.x) + 1, Math.abs(p.y) + 1)
    return Math.min(Math.ceil(m), 60)
  }, [parsed, points])

  const size = 320
  const pad = 14
  const scale = (size - 2 * pad) / (2 * span)
  const sx = (x: number) => pad + (x + span) * scale
  const sy = (y: number) => pad + (span - y) * scale
  const step = span <= 10 ? 1 : span <= 25 ? 5 : 10

  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)

  const toWorld = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * size
    const py = ((e.clientY - rect.top) / rect.height) * size
    const x = Math.round((px - pad) / scale - span)
    const y = Math.round(span - (py - pad) / scale)
    return { x: Math.max(-span, Math.min(span, x)), y: Math.max(-span, Math.min(span, y)) }
  }

  const intersection =
    showIntersection && parsed.length === 2
      ? (() => {
          const [p, q] = parsed
          const det = p.a * q.b - q.a * p.b
          return det === 0 ? null : { x: (p.c * q.b - q.c * p.b) / det, y: (p.a * q.c - q.a * p.c) / det }
        })()
      : null

  const grid = []
  for (let v = -span; v <= span; v += step) {
    grid.push(
      <line key={`gx${v}`} x1={sx(v)} y1={pad} x2={sx(v)} y2={size - pad} stroke="var(--border)" strokeWidth={v === 0 ? 0 : 1} />,
      <line key={`gy${v}`} x1={pad} y1={sy(v)} x2={size - pad} y2={sy(v)} stroke="var(--border)" strokeWidth={v === 0 ? 0 : 1} />,
    )
  }
  const ticks = []
  for (let v = -span; v <= span; v += step * (span > 10 ? 1 : 2)) {
    if (v === 0) continue
    ticks.push(
      <text key={`tx${v}`} x={sx(v)} y={sy(0) + 13} fontSize="9" textAnchor="middle" fill="var(--text-muted)">
        {v}
      </text>,
      <text key={`ty${v}`} x={sx(0) - 5} y={sy(v) + 3} fontSize="9" textAnchor="end" fill="var(--text-muted)">
        {v}
      </text>,
    )
  }

  const segs = parsed.map((l, i) => {
    let p1: [number, number]
    let p2: [number, number]
    if (l.b !== 0) {
      p1 = [-span, (l.c - l.a * -span) / l.b]
      p2 = [span, (l.c - l.a * span) / l.b]
    } else {
      p1 = [l.c / l.a, -span]
      p2 = [l.c / l.a, span]
    }
    return (
      <line
        key={i}
        x1={sx(p1[0])}
        y1={sy(p1[1])}
        x2={sx(p2[0])}
        y2={sy(p2[1])}
        stroke={COLORS[i % 2]}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={i === 1 ? '0' : undefined}
      />
    )
  })

  return (
    <div className="graph-card">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Grafik ${(labels ?? lines.map(prettyEquation)).join(' dan ')}`}
        onPointerDown={(e) => {
          if (!pick) return
          setDragging(true)
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          const w = toWorld(e)
          pick.onPick(w.x, w.y)
        }}
        onPointerMove={(e) => {
          if (pick && dragging) {
            const w = toWorld(e)
            pick.onPick(w.x, w.y)
          }
        }}
        onPointerUp={() => setDragging(false)}
        style={{ cursor: pick ? 'crosshair' : 'default' }}
      >
        <defs>
          <clipPath id="plot">
            <rect x={pad} y={pad} width={size - 2 * pad} height={size - 2 * pad} />
          </clipPath>
        </defs>
        <rect x={0} y={0} width={size} height={size} rx={14} fill="var(--surface)" />
        <g clipPath="url(#plot)">
          {grid}
          <line x1={pad} y1={sy(0)} x2={size - pad} y2={sy(0)} stroke="var(--text-muted)" strokeWidth={1.5} />
          <line x1={sx(0)} y1={pad} x2={sx(0)} y2={size - pad} stroke="var(--text-muted)" strokeWidth={1.5} />
          {segs}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={5} fill="var(--text)" />
              {p.label && (
                <text x={sx(p.x) + 8} y={sy(p.y) - 8} fontSize="11" fontWeight="700" fill="var(--text)">
                  {p.label}
                </text>
              )}
            </g>
          ))}
          {intersection && (
            <g>
              <circle cx={sx(intersection.x)} cy={sy(intersection.y)} r={7} fill="none" stroke="var(--success)" strokeWidth={3} />
            </g>
          )}
          {pick?.value && (
            <g>
              <circle cx={sx(pick.value.x)} cy={sy(pick.value.y)} r={9} fill="var(--primary)" opacity={0.25} />
              <circle cx={sx(pick.value.x)} cy={sy(pick.value.y)} r={5.5} fill="var(--primary)" />
              <text x={sx(pick.value.x) + 10} y={sy(pick.value.y) - 10} fontSize="12" fontWeight="800" fill="var(--primary)">
                ({pick.value.x}, {pick.value.y})
              </text>
            </g>
          )}
        </g>
        {ticks}
        <text x={size - pad - 2} y={sy(0) - 6} fontSize="11" fontWeight="700" fill="var(--var-x)" textAnchor="end">
          x
        </text>
        <text x={sx(0) + 6} y={pad + 10} fontSize="11" fontWeight="700" fill="var(--var-y)">
          y
        </text>
      </svg>
      {lines.length > 0 && (
        <div className="graph-legend">
          {lines.map((l, i) => (
            <span key={i} style={{ color: COLORS[i % 2], fontWeight: 700 }}>
              ━ ({i + 1}) {labels?.[i] ?? prettyEquation(l)}
            </span>
          ))}
        </div>
      )}
      {pick && <p className="muted" style={{ fontSize: '0.85rem', marginTop: 6 }}>Ketuk atau geser untuk memilih titik.</p>}
    </div>
  )
}
