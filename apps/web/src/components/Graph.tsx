import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { axisFor, tickLabel } from '../lib/axis'
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

export const LINE_COLORS = ['var(--var-x)', 'var(--var-y)']
const COLORS = LINE_COLORS

interface Props {
  lines: string[]
  points?: { x: number; y: number; label?: string }[]
  /** Interactive mode: student drags a point that snaps to whole numbers. */
  pick?: { onPick: (x: number, y: number) => void; value: { x: number; y: number } | null }
  showIntersection?: boolean
  labels?: string[]
  /** Only x ≥ 0, y ≥ 0 (story quantities such as prices cannot be negative). */
  firstQuadrant?: boolean
  /** Axis names drawn at the axis ends, e.g. "🍲 x". */
  axisLabels?: { x: string; y: string }
  /** Hide the equation legend (when the caller shows its own). */
  hideLegend?: boolean
}

export function Graph({ lines, points = [], pick, showIntersection = false, labels, firstQuadrant = false, axisLabels, hideLegend = false }: Props) {
  const parsed = useMemo(() => lines.map(parseLine).filter((l): l is NonNullable<typeof l> => l !== null), [lines])

  // Choose a view window that contains the intercepts and the given points.
  const axes = useMemo(() => {
    let m = 6
    let mx = 6
    let my = 6
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
    const room = (v: number) => (Math.abs(v) > 60 ? Math.abs(v) : Math.abs(v) + 1)
    for (const p of pts) {
      if (firstQuadrant && (p.x < 0 || p.y < 0)) continue
      m = Math.max(m, room(p.x), room(p.y))
      mx = Math.max(mx, room(p.x))
      my = Math.max(my, room(p.y))
    }
    // School graphs keep one shared scale; story graphs (first quadrant) scale each axis on its own
    return firstQuadrant ? { x: axisFor(mx, true), y: axisFor(my, true) } : { x: axisFor(m), y: axisFor(m) }
  }, [parsed, points, firstQuadrant])

  const { x: ax, y: ay } = axes
  const lo = ax.lo
  const hi = ax.hi
  const size = 320
  const pad = 14
  // Room for the numbers when the axes sit on the left/bottom edge (first quadrant)
  const padL = firstQuadrant ? 40 : pad
  const padB = firstQuadrant ? 26 : pad
  const scale = (size - padL - pad) / (ax.hi - ax.lo)
  const scaleY = (size - pad - padB) / (ay.hi - ay.lo)
  const sx = (x: number) => padL + (x - ax.lo) * scale
  const sy = (y: number) => pad + (ay.hi - y) * scaleY
  const unitX = ax.hi <= 60 ? 1 : ax.step / 10
  const unitY = ay.hi <= 60 ? 1 : ay.step / 10

  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)

  const toWorld = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * size
    const py = ((e.clientY - rect.top) / rect.height) * size
    const x = Math.round(((px - padL) / scale + ax.lo) / unitX) * unitX
    const y = Math.round((ay.hi - (py - pad) / scaleY) / unitY) * unitY
    return { x: Math.max(ax.lo, Math.min(ax.hi, x)), y: Math.max(ay.lo, Math.min(ay.hi, y)) }
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
  for (let v = ax.lo; v <= ax.hi; v += ax.step) {
    grid.push(<line key={`gx${v}`} x1={sx(v)} y1={pad} x2={sx(v)} y2={sy(ay.lo)} stroke="var(--border)" strokeWidth={v === 0 ? 0 : 1} />)
  }
  for (let v = ay.lo; v <= ay.hi; v += ay.step) {
    grid.push(<line key={`gy${v}`} x1={sx(ax.lo)} y1={sy(v)} x2={size - pad} y2={sy(v)} stroke="var(--border)" strokeWidth={v === 0 ? 0 : 1} />)
  }
  const ticks = []
  for (let v = ax.lo; v <= ax.hi; v += ax.tick) {
    if (v === 0) continue
    ticks.push(
      <text key={`tx${v}`} x={sx(v)} y={sy(0) + 13} fontSize="9" textAnchor="middle" fill="var(--text-muted)">
        {tickLabel(v)}
      </text>,
    )
  }
  for (let v = ay.lo; v <= ay.hi; v += ay.tick) {
    if (v === 0) continue
    ticks.push(
      <text key={`ty${v}`} x={sx(0) - 5} y={sy(v) + 3} fontSize="9" textAnchor="end" fill="var(--text-muted)">
        {tickLabel(v)}
      </text>,
    )
  }

  const segs = parsed.map((l, i) => {
    let p1: [number, number]
    let p2: [number, number]
    if (l.b !== 0) {
      p1 = [lo, (l.c - l.a * lo) / l.b]
      p2 = [hi, (l.c - l.a * hi) / l.b]
    } else {
      p1 = [l.c / l.a, ay.lo]
      p2 = [l.c / l.a, ay.hi]
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
            <rect x={sx(ax.lo)} y={pad} width={sx(ax.hi) - sx(ax.lo)} height={sy(ay.lo) - pad} />
          </clipPath>
        </defs>
        <rect x={0} y={0} width={size} height={size} rx={14} fill="var(--surface)" />
        <g clipPath="url(#plot)">
          {grid}
          <line x1={sx(ax.lo)} y1={sy(0)} x2={size - pad} y2={sy(0)} stroke="var(--text-muted)" strokeWidth={1.5} />
          <line x1={sx(0)} y1={pad} x2={sx(0)} y2={sy(ay.lo)} stroke="var(--text-muted)" strokeWidth={1.5} />
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
                ({tickLabel(pick.value.x)}, {tickLabel(pick.value.y)})
              </text>
            </g>
          )}
        </g>
        {ticks}
        <text x={size - pad - 2} y={sy(0) - 6} fontSize={axisLabels ? 14 : 11} fontWeight="700" fill="var(--var-x)" textAnchor="end">
          {axisLabels?.x ?? 'x'}
        </text>
        <text x={sx(0) + 6} y={pad + 12} fontSize={axisLabels ? 14 : 11} fontWeight="700" fill="var(--var-y)">
          {axisLabels?.y ?? 'y'}
        </text>
      </svg>
      {lines.length > 0 && !hideLegend && (
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
