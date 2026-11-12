import type { ReactNode } from 'react'
import { parseMath, type MathNode } from '../lib/noteMath'

function renderId(s: string, key: number): ReactNode {
  // x and y keep their fixed colors (CLT rule 4); other words stay plain.
  if (/^[xy]+$/.test(s)) {
    return (
      <span key={key}>
        {[...s].map((c, i) => (
          <span key={i} className={c === 'x' ? 'vx' : 'vy'}>
            {c}
          </span>
        ))}
      </span>
    )
  }
  return (
    <span key={key} className="m-id">
      {s}
    </span>
  )
}

function renderNodes(nodes: MathNode[]): ReactNode[] {
  return nodes.map((n, k) => {
    switch (n.t) {
      case 'num':
        return <span key={k}>{n.s}</span>
      case 'id':
        return renderId(n.s, k)
      case 'op':
        return (
          <span key={k} className={/[=+−×÷≤≥≠→⇒<>]/.test(n.s) ? 'm-op' : undefined}>
            {n.s}
          </span>
        )
      case 'sp':
        return <span key={k}> </span>
      case 'group':
        return (
          <span key={k}>
            {n.paren && '('}
            {renderNodes(n.body)}
            {n.paren && ')'}
          </span>
        )
      case 'sup':
        return <sup key={k}>{renderNodes(n.body)}</sup>
      case 'sub':
        return <sub key={k}>{renderNodes(n.body)}</sub>
      case 'sqrt':
        return (
          <span key={k} className="m-sqrt">
            <span className="m-radical" aria-hidden="true">
              √
            </span>
            <span className="m-radicand">{renderNodes(n.body)}</span>
          </span>
        )
      case 'frac':
        return (
          <span key={k} className="m-frac">
            <span className="m-num">{renderNodes(n.num)}</span>
            <span className="m-den">{renderNodes(n.den)}</span>
          </span>
        )
    }
  })
}

/** Renders one equation written in the note syntax (see lib/noteMath.ts). */
export function MathRender({ src, block = false }: { src: string; block?: boolean }) {
  const lines = block ? src.split('\n').filter((l) => l.trim()) : [src]
  if (block && lines.length >= 2) {
    return (
      <span className="m-block m-system" role="math" aria-label={lines.join('; ')}>
        <svg className="m-brace" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M11 1 C5 1 6 8 6 20 L6 40 C6 47 4 50 1 50 C4 50 6 53 6 60 L6 80 C6 92 5 99 11 99" fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="m-lines">
          {lines.map((l, i) => (
            <span key={i} className="m-line">
              {renderNodes(parseMath(l.trim()))}
            </span>
          ))}
        </span>
      </span>
    )
  }
  return (
    <span className={`m-eq${block ? ' m-block' : ''}`} role="math" aria-label={src}>
      {renderNodes(parseMath(lines[0]?.trim() ?? ''))}
    </span>
  )
}
