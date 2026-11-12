/**
 * Note equations: a tiny, student-friendly math syntax stored as plain text.
 *
 *   $2x + y = 7$          inline equation inside a sentence
 *   $$                    block equation; two or more lines render as a system with a brace
 *   2x + y = 7
 *   x - y = 2
 *   $$
 *
 * Inside an equation: x^2 (power), x_1 (subscript), a/b or (a+b)/(c) (stacked fraction),
 * sqrt(9) or √(9) (root), and ASCII shortcuts <= >= != -> => * pi become ≤ ≥ ≠ → ⇒ × π.
 * A literal dollar sign is written as \$.
 */

export type NoteSegment =
  | { kind: 'text'; text: string; start: number; end: number }
  | { kind: 'math'; src: string; block: boolean; start: number; end: number }

export function parseNote(body: string): NoteSegment[] {
  const out: NoteSegment[] = []
  let buf = ''
  let bufStart = 0
  let i = 0
  const flush = (at: number) => {
    if (buf) out.push({ kind: 'text', text: buf, start: bufStart, end: at })
    buf = ''
    bufStart = at
  }
  while (i < body.length) {
    const ch = body[i]
    if (ch === '\\' && body[i + 1] === '$') {
      if (!buf) bufStart = i
      buf += '$'
      i += 2
      continue
    }
    if (ch === '$') {
      const block = body[i + 1] === '$'
      const open = block ? 2 : 1
      const end = body.indexOf(block ? '$$' : '$', i + open)
      const inner = end >= 0 ? body.slice(i + open, end) : ''
      if (end >= 0 && inner.trim() && (block || !inner.includes('\n'))) {
        flush(i)
        out.push({ kind: 'math', src: block ? inner.replace(/^\s*\n|\n\s*$/g, '') : inner, block, start: i, end: end + open })
        i = end + open
        bufStart = i
        continue
      }
    }
    if (!buf) bufStart = i
    buf += ch
    i += 1
  }
  flush(i)
  return out
}

/** ASCII shortcuts → math symbols (applied when rendering, the stored text stays easy to type). */
export function prettifyMath(src: string): string {
  return src
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/=>/g, '⇒')
    .replace(/->/g, '→')
    .replace(/\*/g, '×')
    .replace(/-/g, '−')
    .replace(/\bsqrt\b/g, '√')
    .replace(/\bpi\b/g, 'π')
}

export type MathNode =
  | { t: 'num'; s: string }
  | { t: 'id'; s: string }
  | { t: 'op'; s: string }
  | { t: 'sp' }
  | { t: 'group'; body: MathNode[]; paren: boolean }
  | { t: 'sup'; body: MathNode[] }
  | { t: 'sub'; body: MathNode[] }
  | { t: 'sqrt'; body: MathNode[] }
  | { t: 'frac'; num: MathNode[]; den: MathNode[] }

type Tok = { k: 'num' | 'id' | 'op' | 'sp' | 'sym'; s: string }

function tokenize(src: string): Tok[] {
  const toks: Tok[] = []
  const re = /(\s+)|(\d+(?:[.,]\d+)*)|([A-Za-zÀ-ÿα-ωπ]+)|([\^_/(){}√])|(.)/gu
  for (const m of src.matchAll(re)) {
    if (m[1]) toks.push({ k: 'sp', s: m[1] })
    else if (m[2]) toks.push({ k: 'num', s: m[2] })
    else if (m[3]) toks.push({ k: 'id', s: m[3] })
    else if (m[4]) toks.push({ k: 'sym', s: m[4] })
    else toks.push({ k: 'op', s: m[5] })
  }
  return toks
}

const isTermNode = (n: MathNode) => n.t !== 'op' && n.t !== 'sp'
const unwrap = (nodes: MathNode[]): MathNode[] =>
  nodes.length === 1 && nodes[0].t === 'group' ? nodes[0].body : nodes

class Parser {
  private i = 0
  constructor(private toks: Tok[]) {}

  private peek(): Tok | undefined {
    return this.toks[this.i]
  }

  /** One atom plus any directly attached ^ / _ (used for denominators and roots). */
  private atomWithScripts(): MathNode[] | null {
    const a = this.atom()
    if (!a) return null
    const nodes = [...a]
    while (this.peek()?.s === '^' || this.peek()?.s === '_') {
      const kind = this.toks[this.i++].s === '^' ? 'sup' : 'sub'
      const b = this.atom()
      if (b) nodes.push({ t: kind, body: unwrap(b) })
      else nodes.push({ t: 'op', s: kind === 'sup' ? '^' : '_' })
    }
    return nodes
  }

  private atom(): MathNode[] | null {
    const tok = this.peek()
    if (!tok) return null
    if (tok.k === 'num' || tok.k === 'id') {
      this.i++
      return [{ t: tok.k, s: tok.s }]
    }
    if (tok.s === '(' || tok.s === '{') {
      this.i++
      const body = this.seq(tok.s === '(' ? ')' : '}')
      return [{ t: 'group', body, paren: tok.s === '(' }]
    }
    if (tok.s === '√') {
      this.i++
      const b = this.atomWithScripts()
      return [{ t: 'sqrt', body: b ? unwrap(b) : [] }]
    }
    return null
  }

  seq(stop?: string): MathNode[] {
    const out: MathNode[] = []
    while (this.i < this.toks.length) {
      const tok = this.toks[this.i]
      if (stop && tok.s === stop) {
        this.i++
        return out
      }
      if (tok.k === 'sp') {
        this.i++
        out.push({ t: 'sp' })
        continue
      }
      if (tok.s === '^' || tok.s === '_') {
        this.i++
        const b = this.atom()
        if (b) out.push({ t: tok.s === '^' ? 'sup' : 'sub', body: unwrap(b) })
        else out.push({ t: 'op', s: tok.s })
        continue
      }
      if (tok.s === '/') {
        this.i++
        let k = out.length
        while (k > 0 && isTermNode(out[k - 1])) k--
        const num = out.splice(k)
        const den = this.atomWithScripts()
        if (!num.length || !den) {
          out.push(...num, { t: 'op', s: '/' })
          if (den) out.push(...den)
          continue
        }
        out.push({ t: 'frac', num: unwrap(num), den: unwrap(den) })
        continue
      }
      const a = this.atom()
      if (a) {
        out.push(...a)
        continue
      }
      // Unmatched closing bracket or any other symbol: show it as written
      this.i++
      out.push({ t: 'op', s: tok.s })
    }
    return out
  }
}

export function parseMath(src: string): MathNode[] {
  return new Parser(tokenize(prettifyMath(src))).seq()
}

/** Insert `text` into `value` replacing [start, end); returns the new value and caret position. */
export function insertAt(value: string, start: number, end: number, text: string, caretOffset = text.length) {
  return { value: value.slice(0, start) + text + value.slice(end), caret: start + caretOffset }
}
