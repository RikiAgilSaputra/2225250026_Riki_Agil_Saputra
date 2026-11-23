// Axis scaling for Graph.tsx: small school numbers keep the old unit grid; story values (rupiah) get "nice" steps.

/** Smallest 1·10ⁿ, 2·10ⁿ or 5·10ⁿ that is ≥ n. */
export function niceStep(n: number): number {
  if (!(n > 0)) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  for (const m of [1, 2, 5, 10]) if (m * p >= n) return m * p
  return 10 * p
}

export interface Axis {
  /** lowest and highest value shown on both axes */
  lo: number
  hi: number
  /** grid spacing */
  step: number
  /** spacing of the numbered ticks */
  tick: number
}

/**
 * Picks the window for the given extent m (largest |coordinate| to show).
 * firstQuadrant: only 0…hi (quantities in stories cannot be negative).
 */
export function axisFor(m: number, firstQuadrant = false): Axis {
  if (m <= 60) {
    const span = Math.max(6, Math.ceil(m))
    const step = span <= 10 ? 1 : span <= 25 ? 5 : 10
    return { lo: firstQuadrant ? 0 : -span, hi: span, step, tick: step * (span > 10 ? 1 : firstQuadrant ? 1 : 2) }
  }
  const step = niceStep(m / (firstQuadrant ? 5 : 3))
  const hi = Math.ceil((m * 1.1) / step) * step
  return { lo: firstQuadrant ? 0 : -hi, hi, step, tick: step }
}

/** Short tick label: 5000 → "5 rb", 1500000 → "1,5 jt". */
export function tickLabel(v: number): string {
  const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
  const a = Math.abs(v)
  const s = a >= 1e6 ? `${fmt(a / 1e6)} jt` : a >= 1e4 ? `${fmt(a / 1e3)} rb` : fmt(a)
  return v < 0 ? `−${s}` : s
}
