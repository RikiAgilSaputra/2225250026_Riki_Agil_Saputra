import { describe, expect, it } from 'vitest'
import { axisFor, niceStep, tickLabel } from './axis'

describe('graph axis', () => {
  it('keeps the unit grid for small school numbers', () => {
    expect(axisFor(4)).toEqual({ lo: -6, hi: 6, step: 1, tick: 2 })
    expect(axisFor(13)).toEqual({ lo: -13, hi: 13, step: 5, tick: 5 })
  })

  it('scales to story values such as rupiah', () => {
    const a = axisFor(13750, true) // 3x + 2y = 27.500 crosses the y-axis at 13.750
    expect(a.lo).toBe(0)
    expect(a.hi).toBeGreaterThanOrEqual(13750)
    expect(a.step).toBe(5000)
    expect(a.hi / a.step).toBeLessThanOrEqual(6)
  })

  it('rounds steps to 1, 2 or 5 times a power of ten', () => {
    expect(niceStep(2750)).toBe(5000)
    expect(niceStep(1100)).toBe(2000)
    expect(niceStep(900)).toBe(1000)
    expect(niceStep(0)).toBe(1)
  })

  it('writes short Indonesian tick labels', () => {
    expect(tickLabel(5000)).toBe('5000')
    expect(tickLabel(15000)).toBe('15 rb')
    expect(tickLabel(1500000)).toBe('1,5 jt')
    expect(tickLabel(-2)).toBe('−2')
  })
})
