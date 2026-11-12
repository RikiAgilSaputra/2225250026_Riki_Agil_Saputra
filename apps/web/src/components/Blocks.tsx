import type { Block } from '../lib/types'
import { Graph } from './Graph'
import { MathRender } from './MathRender'
import { MathText } from './MathText'

const CYCLE = ['1. Pahami', '2. Tentukan variabel', '3. Terjemahkan', '4. Selesaikan', '5. Tafsirkan', '6. Periksa']

function NumberLine({ from = -5, to = 5, marks = [] }: { from?: number; to?: number; marks?: number[] }) {
  const w = 320
  const n = to - from
  const x = (v: number) => 16 + ((v - from) / n) * (w - 32)
  return (
    <svg viewBox={`0 0 ${w} 60`} style={{ maxWidth: 480 }} role="img" aria-label="Garis bilangan">
      <line x1={8} y1={30} x2={w - 8} y2={30} stroke="var(--text-muted)" strokeWidth={2} />
      {Array.from({ length: n + 1 }, (_, i) => from + i).map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={24} x2={x(v)} y2={36} stroke="var(--text-muted)" />
          <text x={x(v)} y={52} fontSize="11" textAnchor="middle" fill={v < 0 ? 'var(--error)' : 'var(--text)'}>
            {v < 0 ? `−${-v}` : v}
          </text>
        </g>
      ))}
      {marks.map((m) => (
        <circle key={m} cx={x(m)} cy={30} r={6} fill="var(--primary)" />
      ))}
    </svg>
  )
}

/** Renders one lesson block. Each screen holds one concept (CLT rule 2). */
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'math':
      return <MathText as="div" text={block.text ?? ''} />
    case 'callout':
      return <div className="callout">{block.text}</div>
    case 'quote':
      return <div className="quote">“{block.text}”</div>
    case 'arrow':
      return <div className="arrow-block">↓ {block.label}</div>
    case 'table':
      return (
        <div className="table-wrap">
          <table className="xy">
            <tbody>
              {block.rows?.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>
                      <MathText text={c} className={c === 'x' || c === 'y' ? 'math' : ''} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'graph':
      return (
        <div style={{ maxWidth: 420 }}>
          <Graph lines={block.lines ?? []} points={block.points} />
        </div>
      )
    case 'numberline':
      return <NumberLine from={block.from} to={block.to} marks={block.marks} />
    case 'vars':
      return (
        <div className="var-chips">
          <span className="var-chip x">
            <b>x</b> = {block.x}
          </span>
          <span className="var-chip y">
            <b>y</b> = {block.y}
          </span>
        </div>
      )
    case 'system':
      return (
        <div className="system">
          {block.equations?.map((e, i) => (
            <MathText key={i} as="div" text={`(${i + 1})   ${e}`} />
          ))}
        </div>
      )
    case 'definition':
      return (
        <div className="definition">
          <b>{block.term}</b>
          <p>{block.text}</p>
        </div>
      )
    case 'anatomy':
      return (
        <div className={`anatomy${block.focus ? ` focus-${block.focus}` : ''}`} role="img" aria-label={block.parts?.map((p) => (p.label ? `${p.text} (${p.label})` : p.text)).join(' ')}>
          {block.parts?.map((p, i) => (
            <span key={i} className={`part${p.label ? ` ${p.label}` : ' op'}`}>
              <span className="part-text">
                <MathText text={p.text} className="" />
              </span>
              {p.label && <small>{p.label}</small>}
            </span>
          ))}
        </div>
      )
    case 'steps':
      return (
        <ol className="steps-list">
          {block.items?.map((it, i) => (
            <li key={i}>
              <span className="step-no">{i + 1}</span>
              <span>
                <MathText text={it} className="" />
              </span>
            </li>
          ))}
        </ol>
      )
    case 'eq':
      return block.lines ? (
        <div className="eq-lines">
          {block.lines.map((l, i) => (
            <div key={i}>
              <MathRender src={l} />
            </div>
          ))}
        </div>
      ) : (
        <div className="eq-block">
          <MathRender src={block.text ?? ''} block={(block.text ?? '').includes('\n')} />
        </div>
      )
    case 'cycle':
      return (
        <div className="cycle">
          {CYCLE.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      )
    default:
      return <p>{block.text}</p>
  }
}
