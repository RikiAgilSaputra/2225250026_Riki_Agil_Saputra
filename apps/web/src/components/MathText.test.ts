import { describe, expect, it } from 'vitest'
import { parseLine } from './Graph'
import { prettyEquation, tokenizeMath } from './MathText'

describe('tokenizeMath', () => {
  it('colors standalone x and y only', () => {
    const t = tokenizeMath('2x + y = 7, harga buku x')
    expect(t.filter((p) => p.v).map((p) => p.v)).toEqual(['x', 'y', 'x'])
    expect(tokenizeMath('Tentukan nilai').some((p) => p.v)).toBe(false)
  })
})

describe('parseLine', () => {
  it('parses builder output and plain forms', () => {
    expect(parseLine('(2)*x + (1)*y = 7')).toEqual({ a: 2, b: 1, c: 7 })
    expect(parseLine('(-2000)*x + (1)*y = 50000')).toEqual({ a: -2000, b: 1, c: 50000 })
    expect(parseLine('2*x - y = 2')).toEqual({ a: 2, b: -1, c: 2 })
    expect(parseLine('x + y = 4')).toEqual({ a: 1, b: 1, c: 4 })
  })
})

describe('prettyEquation', () => {
  it('drops * between number and variable', () => {
    expect(prettyEquation('2*x + 3*y = 19000')).toBe('2x + 3y = 19000')
  })
})
