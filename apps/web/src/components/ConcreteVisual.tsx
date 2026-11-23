import { Fragment } from 'react'
import { idNumber, isCount, MAX_REPEAT, objectIcon, objectName, parseLinear, rhsLabel } from '../lib/concrete'

export interface ConcreteVar {
  meaning: string
  unit?: string
}
type Vars = { x: ConcreteVar; y: ConcreteVar }

/** One object: its emoji, or a coloured x/y tile when no picture fits (x stays blue, y orange — CLT rule 4). */
function Token({ v, vars }: { v: 'x' | 'y'; vars?: Vars }) {
  const icon = vars ? objectIcon(vars[v].meaning) : null
  return icon ? (
    <span className="obj" aria-hidden="true">
      {icon}
    </span>
  ) : (
    <span className={`ctile ${v}`} aria-hidden="true">
      {v}
    </span>
  )
}

function Term({ k, v, vars }: { k: number; v: 'x' | 'y'; vars?: Vars }) {
  const n = Math.abs(k)
  const count = vars ? isCount(vars[v].meaning, vars[v].unit) : false
  // A value per object ("harga 1 buku"): 2x is two books. A count ("banyak ayam"): 2x is "2 × the chickens".
  const repeat = !count && Number.isInteger(n) && n <= MAX_REPEAT
  return (
    <span className="cterm">
      <span className="cobjs">
        {repeat ? (
          Array.from({ length: n }, (_, i) => <Token key={i} v={v} vars={vars} />)
        ) : (
          <>
            {n !== 1 && <b className="cmul">{idNumber(n)} ×</b>}
            <Token v={v} vars={vars} />
          </>
        )}
      </span>
      <small className={`ctag ${v}`}>{v}</small>
    </span>
  )
}

/** Objects named in the story. Untagged before the student has chosen x and y, so nothing is given away. */
export function ObjectLegend({ vars, tagged }: { vars: Vars; tagged: boolean }) {
  return (
    <div className="var-chips">
      {(['x', 'y'] as const).map((v) => (
        <span key={v} className={tagged ? `var-chip ${v}` : 'chip'}>
          <span className="obj-sm" aria-hidden="true">
            {objectIcon(vars[v].meaning) ?? '▢'}
          </span>{' '}
          {tagged ? (
            <>
              <b>{v}</b> = {vars[v].meaning}
            </>
          ) : (
            objectName(vars[v].meaning)
          )}
        </span>
      ))}
    </div>
  )
}

/** An equation drawn with concrete objects, e.g. 📘📘 + ✏️✏️✏️ = Rp19.000. Returns nothing if it cannot be read. */
export function EquationPicture({ eq, vars, n }: { eq: string; vars?: Vars; n?: number }) {
  const lin = parseLinear(eq)
  if (!lin) return null
  const terms = ([['x', lin.a], ['y', lin.b]] as const).filter(([, k]) => k !== 0)
  const said = terms
    .map(([v, k]) => `${idNumber(Math.abs(k))} ${vars ? objectName(vars[v].meaning) : v}`)
    .join(' dan ')
  return (
    <div className="cpic" role="img" aria-label={`${said} sama dengan ${rhsLabel(lin, vars?.x.unit, vars?.y.unit)}`}>
      {n !== undefined && <small className="muted cno">({n})</small>}
      {terms.map(([v, k], i) => (
        <Fragment key={v}>
          {(i > 0 || k < 0) && <span className="cop">{k < 0 ? '−' : '+'}</span>}
          <Term k={k} v={v} vars={vars} />
        </Fragment>
      ))}
      <span className="ceq">
        <span className="cop">=</span>
        <span className="crhs">{rhsLabel(lin, vars?.x.unit, vars?.y.unit)}</span>
      </span>
    </div>
  )
}

/**
 * Concrete panel for the solver and the AI modeler.
 * stage "objects": only what the story is about; "variables": objects tagged x/y; "equations": also the pictures.
 */
export function ConcretePanel({
  vars,
  equations,
  stage,
  open = true,
}: {
  vars?: Vars
  equations?: string[] | null
  stage: 'objects' | 'variables' | 'equations'
  open?: boolean
}) {
  const pictures = stage === 'equations' ? (equations ?? []).filter((e) => parseLinear(e)) : []
  if (!vars && !pictures.length) return null
  return (
    <details className="concrete" open={open}>
      <summary>🧺 Gambar benda</summary>
      {vars && <ObjectLegend vars={vars} tagged={stage !== 'objects'} />}
      {pictures.map((e, i) => (
        <EquationPicture key={i} eq={e} vars={vars} n={pictures.length > 1 ? i + 1 : undefined} />
      ))}
      {!vars && pictures.length > 0 && (
        <small className="muted">Bayangkan x sebagai kotak biru dan y sebagai kotak oranye.</small>
      )}
    </details>
  )
}
