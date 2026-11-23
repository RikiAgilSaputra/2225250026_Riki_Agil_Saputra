import type { ComponentProps } from 'react'
import { objectIcon, objectName, parseLinear } from '../lib/concrete'
import { EquationPicture, type ConcreteVar } from './ConcreteVisual'
import { Graph, LINE_COLORS } from './Graph'

type GraphProps = ComponentProps<typeof Graph>

/**
 * A graph with the objects of the story beside it: each coloured line is paired with the same equation drawn
 * as objects, and each axis is named by its object. Helps students read a line as "all the prices that fit one
 * sentence" and the crossing point as "the prices that fit both" (RMT structure–function, K02 concrete-first).
 */
export function ConcreteGraph({
  equations,
  vars,
  labels,
  ...graph
}: Omit<GraphProps, 'lines' | 'firstQuadrant' | 'axisLabels' | 'hideLegend'> & {
  equations: string[]
  vars?: { x: ConcreteVar; y: ConcreteVar }
}) {
  const icon = (v: 'x' | 'y') => (vars ? objectIcon(vars[v].meaning) : null)
  const axisLabels = vars ? { x: `${icon('x') ?? ''} x`.trim(), y: `${icon('y') ?? ''} y`.trim() } : undefined
  const readable = equations.filter((e) => parseLinear(e))
  return (
    <div className="cgraph">
      <Graph lines={equations} labels={labels} firstQuadrant={Boolean(vars)} axisLabels={axisLabels} hideLegend {...graph} />
      <div className="cgraph-side">
        {vars && (
          <p className="cgraph-axes">
            <span className="var-chip x">
              <b>x</b> → {icon('x')} {objectName(vars.x.meaning)}
            </span>
            <span className="var-chip y">
              <b>y</b> ↑ {icon('y')} {objectName(vars.y.meaning)}
            </span>
          </p>
        )}
        {readable.map((e, i) => (
          <div key={i} className="cgraph-line" style={{ borderLeftColor: LINE_COLORS[i % 2] }}>
            <small style={{ color: LINE_COLORS[i % 2], fontWeight: 800 }}>
              ━ garis ({i + 1}){labels?.[i] ? `: ${labels[i]}` : ''}
            </small>
            <EquationPicture eq={e} vars={vars} />
          </div>
        ))}
        {readable.length === 2 && (
          <small className="muted">
            {vars
              ? `Titik potong kedua garis: ${icon('x') ?? 'x'} dan ${icon('y') ?? 'y'} yang cocok untuk kedua kalimat sekaligus.`
              : 'Titik potong kedua garis memenuhi kedua persamaan sekaligus.'}
          </small>
        )}
      </div>
    </div>
  )
}
