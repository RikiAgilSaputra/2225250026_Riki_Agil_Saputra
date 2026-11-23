import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { idNumber, isCount, objectIcon, objectName, parseLinear, rhsLabel } from './concrete'

describe('concrete pictures', () => {
  it('reads the equation forms used by content, generator and AI', () => {
    expect(parseLinear('2*x + 3*y = 19000')).toEqual({ a: 2, b: 3, c: 19000 })
    expect(parseLinear('x - 3*y = 0')).toEqual({ a: 1, b: -3, c: 0 })
    expect(parseLinear('3x + 2y = 17.000')).toEqual({ a: 3, b: 2, c: 17000 })
    expect(parseLinear('x = 3y')).toEqual({ a: 1, b: -3, c: 0 })
    expect(parseLinear('−x + y = −2')).toEqual({ a: -1, b: 1, c: -2 })
    expect(parseLinear('1/2*x + y = 4')).toEqual({ a: 0.5, b: 1, c: 4 })
    expect(parseLinear('(2)*x + (4)*y = 144')).toEqual({ a: 2, b: 4, c: 144 }) // generator
    expect(parseLinear('(3)*x + (-2)*y + (0) = 5')).toEqual({ a: 3, b: -2, c: 5 })
  })

  it('refuses what is not a linear equation in x and y', () => {
    expect(parseLinear('2x + 5 = 11 + 2x')).toBeNull()
    expect(parseLinear('a = 3n')).toBeNull()
    expect(parseLinear('x^2 + y = 5')).toBeNull()
    expect(parseLinear('2x + y')).toBeNull()
  })

  it('picks a picture from the meaning, most specific word first', () => {
    expect(objectIcon('harga 1 buku')).toBe('📘')
    expect(objectIcon('harga 1 mi ayam')).toBe('🍜')
    expect(objectIcon('banyak ayam')).toBe('🐔')
    expect(objectIcon('banyak sepeda motor')).toBe('🏍️')
    expect(objectIcon('harga 1 kaset')).toBe('📼')
    expect(objectIcon('sesuatu yang lain')).toBeNull()
  })

  it('tells counts from values and names the object', () => {
    expect(isCount('banyak ayam', 'ekor')).toBe(true)
    expect(isCount('harga 1 ekor ayam', 'rupiah')).toBe(false)
    expect(isCount('banyak mobil', 'kendaraan')).toBe(true)
    expect(objectName('harga 1 kg beras')).toBe('beras')
    expect(objectName('harga 1 ekor kambing')).toBe('kambing')
    expect(objectName('banyak ayam')).toBe('ayam')
    expect(objectName('harga 1 pensil (rupiah)')).toBe('pensil')
  })

  it('labels the right-hand side with its unit only when it is unambiguous', () => {
    expect(idNumber(19000)).toBe('19.000')
    expect(rhsLabel({ a: 2, b: 3, c: 19000 }, 'rupiah', 'rupiah')).toBe('Rp19.000')
    expect(rhsLabel({ a: 1, b: 1, c: 30 }, 'ekor', 'ekor')).toBe('30 ekor')
    expect(rhsLabel({ a: 2, b: 4, c: 80 }, 'ekor', 'ekor')).toBe('80') // legs, not animals
  })

  it('can draw every story in content/', () => {
    const dir = join(__dirname, '../../../../content/modules')
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      for (const m of JSON.parse(readFileSync(join(dir, f), 'utf8'))) {
        for (const p of m.problems ?? []) {
          if (!p.story) continue
          for (const e of p.system ?? []) expect(parseLinear(e), `${p.id}: ${e}`).not.toBeNull()
        }
      }
    }
  })
})
