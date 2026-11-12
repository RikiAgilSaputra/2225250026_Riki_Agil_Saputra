import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NoteBody } from '../components/NoteBody'
import { insertAt, parseMath, parseNote, prettifyMath } from './noteMath'

describe('parseNote', () => {
  it('splits text, inline and block equations with source offsets', () => {
    const body = 'Contoh $2x + y = 7$ lalu\n$$\nx + y = 5\nx - y = 1\n$$\nselesai'
    const segs = parseNote(body)
    expect(segs.map((s) => s.kind)).toEqual(['text', 'math', 'text', 'math', 'text'])
    const inline = segs[1]
    expect(inline).toMatchObject({ kind: 'math', src: '2x + y = 7', block: false })
    expect(body.slice(inline.start, inline.end)).toBe('$2x + y = 7$')
    expect(segs[3]).toMatchObject({ kind: 'math', src: 'x + y = 5\nx - y = 1', block: true })
  })

  it('keeps unmatched or escaped dollars as text', () => {
    expect(parseNote('harga \\$5 dan $ saja')).toEqual([{ kind: 'text', text: 'harga $5 dan $ saja', start: 0, end: 20 }])
    expect(parseNote('$a\nb$').every((s) => s.kind === 'text')).toBe(true)
  })
})

describe('parseMath', () => {
  it('turns shortcuts into symbols', () => {
    expect(prettifyMath('x <= 3, y >= 1, a != b, p -> q, 2*3, 5-2')).toBe('x ≤ 3, y ≥ 1, a ≠ b, p → q, 2×3, 5−2')
  })

  it('builds fractions, powers, subscripts and roots', () => {
    expect(parseMath('1/2')).toEqual([{ t: 'frac', num: [{ t: 'num', s: '1' }], den: [{ t: 'num', s: '2' }] }])
    const f = parseMath('(x+1)/2x')
    expect(f[0]).toMatchObject({ t: 'frac', den: [{ t: 'num', s: '2' }] })
    expect((f[0] as { num: unknown[] }).num).toHaveLength(3)
    expect(parseMath('x^2')).toEqual([{ t: 'id', s: 'x' }, { t: 'sup', body: [{ t: 'num', s: '2' }] }])
    expect(parseMath('x_1')).toEqual([{ t: 'id', s: 'x' }, { t: 'sub', body: [{ t: 'num', s: '1' }] }])
    expect(parseMath('sqrt(9)')).toEqual([{ t: 'sqrt', body: [{ t: 'num', s: '9' }] }])
  })

  it('never throws on odd input', () => {
    for (const s of ['/', '^', ')(', '((', '√', 'x/', '}{', '$$']) expect(() => parseMath(s)).not.toThrow()
  })
})

describe('NoteBody rendering', () => {
  it('colors x and y and draws a system brace', () => {
    const html = renderToStaticMarkup(createElement(NoteBody, { body: '$$\n2x + y = 7\nx - y = 2\n$$' }))
    expect(html).toContain('m-system')
    expect(html).toContain('m-brace')
    expect(html).toContain('class="vx"')
    expect(html).toContain('class="vy"')
  })
})

describe('insertAt', () => {
  it('replaces the selection and places the caret', () => {
    expect(insertAt('ab', 1, 1, '()', 1)).toEqual({ value: 'a()b', caret: 2 })
  })
})
