import type { ReactNode } from 'react'

/**
 * Renders math text with fixed variable colors: x blue, y orange (CLT rule 4).
 * Only standalone x / y tokens are colored ("x", "2x", "3y") — not letters inside words.
 */
export function tokenizeMath(text: string): { t: string; v?: 'x' | 'y' }[] {
  const out: { t: string; v?: 'x' | 'y' }[] = []
  const re = /(?<![A-Za-zÀ-ÿ])([xy])(?![A-Za-zÀ-ÿ])/g
  let last = 0
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0
    if (i > last) out.push({ t: text.slice(last, i) })
    out.push({ t: m[1], v: m[1] as 'x' | 'y' })
    last = i + 1
  }
  if (last < text.length) out.push({ t: text.slice(last) })
  return out
}

export function prettyEquation(s: string): string {
  return s
    .replace(/\*\*/g, '^')
    .replace(/(\d)\s*\*\s*([xy(])/g, '$1$2')
    .replace(/\*/g, ' × ')
    .replace(/-/g, '−')
    .replace(/\s+/g, ' ')
    .trim()
}

export function MathText({ text, className = 'math', as = 'span' }: { text: string; className?: string; as?: 'span' | 'div' }) {
  const parts: ReactNode[] = tokenizeMath(text).map((p, i) =>
    p.v ? (
      <span key={i} className={p.v === 'x' ? 'vx' : 'vy'}>
        {p.t}
      </span>
    ) : (
      <span key={i}>{p.t}</span>
    ),
  )
  const Tag = as
  return <Tag className={className}>{parts}</Tag>
}

export function VarChips({ vars }: { vars: { x: { meaning: string; unit: string }; y: { meaning: string; unit: string } } }) {
  return (
    <div className="var-chips" aria-label="Arti variabel">
      <span className="var-chip x">
        <b>x</b> = {vars.x.meaning} ({vars.x.unit})
      </span>
      <span className="var-chip y">
        <b>y</b> = {vars.y.meaning} ({vars.y.unit})
      </span>
    </div>
  )
}
