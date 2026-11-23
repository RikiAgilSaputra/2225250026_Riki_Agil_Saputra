// Concrete-object pictures for word problems and equations (K02: concrete before abstract).
// Pure helpers; the drawing lives in components/ConcreteVisual.tsx.

/** Keyword → emoji. Longer/more specific keywords first ("mi ayam" before "ayam"). */
const ICONS: [string, string][] = [
  ['mi ayam', '🍜'],
  ['es jeruk', '🍹'],
  ['es teh', '🧋'],
  ['susu', '🥛'],
  ['roti', '🍞'],
  ['bakso', '🍲'],
  ['beras', '🍚'],
  ['jagung', '🌽'],
  ['gula', '🍬'],
  ['sabun', '🧼'],
  ['buku', '📘'],
  ['pensil', '✏️'],
  ['pulpen', '🖊️'],
  ['bolpoin', '🖊️'],
  ['penghapus', '🧽'],
  ['majalah', '📰'],
  ['compact disc', '💿'],
  ['kaset', '📼'],
  ['kaos', '👕'],
  ['sweater', '🧥'],
  ['baju', '👔'],
  ['celana', '👖'],
  ['cat', '🪣'],
  ['sepeda motor', '🏍️'],
  ['motor', '🏍️'],
  ['mobil', '🚗'],
  ['ayam', '🐔'],
  ['itik', '🦆'],
  ['bebek', '🦆'],
  ['kambing', '🐐'],
  ['sapi', '🐄'],
  ['putra', '👦'],
  ['putri', '👧'],
  ['siswa', '🧑‍🎓'],
  ['kuota', '📶'],
  ['uang', '💰'],
  ['biaya', '💰'],
  ['usia', '🎂'],
  ['umur', '🎂'],
  ['sudut', '📐'],
  ['jarak', '📏'],
  ['panjang', '📏'],
  ['lebar', '📏'],
  ['waktu', '🕒'],
  ['lama', '🕒'],
  ['berat', '⚖️'],
]

export function objectIcon(meaning: string | undefined | null): string | null {
  const m = (meaning ?? '').toLowerCase()
  for (const [k, icon] of ICONS) if (new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(m)) return icon
  return null
}

const COUNT_UNITS = new Set(['ekor', 'kendaraan', 'anak', 'eksemplar', 'buah', 'orang', 'lembar', 'unit', 'batang'])

/** "banyak ayam" counts objects; "harga 1 buku" is a value per object. They are drawn differently. */
export function isCount(meaning: string, unit = ''): boolean {
  const m = meaning.toLowerCase().trim()
  if (/^(harga|biaya|berat|usia|umur|uang|jarak|waktu|lama|panjang|lebar|besar)\b/.test(m)) return false
  return /^(banyak|jumlah)\b/.test(m) || COUNT_UNITS.has(unit.toLowerCase().trim())
}

/** Short noun for a label: "harga 1 kg beras" → "beras", "banyak ayam" → "ayam". */
export function objectName(meaning: string): string {
  return meaning
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^(harga|banyak|jumlah|berat)\s+(1\s+)?((kg|ekor|batang|buah|karung|lembar)\s+)?/i, '')
    .trim()
}

export interface Linear {
  a: number
  b: number
  c: number
}

function termValue(coef: string): number | null {
  if (coef === '' || coef === '+') return 1
  if (coef === '-') return -1
  const sign = coef.startsWith('-') ? -1 : 1
  const body = coef.replace(/^[+-]/, '')
  const [n, d] = body.split('/')
  const v = Number(n) / (d === undefined ? 1 : Number(d))
  return Number.isFinite(v) ? sign * v : null
}

/** Parses a linear equation in x and y ("2*x + 3*y = 19000", "x = 3y", "x − y = 6") into ax + by = c. */
export function parseLinear(eq: string): Linear | null {
  const norm = eq
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2') // 19.000 → 19000
    .replace(/\s+/g, '')
    .replace(/\((-?\d+(?:\.\d+)?(?:\/\d+)?)\)/g, '$1') // generator form: (2)*x + (-3)*y
    .replace(/\+-/g, '-')
    .replace(/--/g, '+')
  const sides = norm.split('=')
  if (sides.length !== 2 || !sides[0] || !sides[1]) return null
  const out: Linear = { a: 0, b: 0, c: 0 }
  for (const [i, side] of sides.entries()) {
    const sgn = i === 0 ? 1 : -1 // move everything to the left, constants to the right
    const terms = (/^[+-]/.test(side) ? side : `+${side}`).match(/[+-][^+-]+/g)
    if (!terms || terms.join('') !== (/^[+-]/.test(side) ? side : `+${side}`)) return null
    for (const t of terms) {
      const m = /^([+-](?:\d+(?:\.\d+)?(?:\/\d+)?)?)\*?\(?([xy])?\)?$/.exec(t)
      if (!m) return null
      const v = termValue(m[1])
      if (v === null) return null
      if (m[2] === 'x') out.a += sgn * v
      else if (m[2] === 'y') out.b += sgn * v
      else out.c -= sgn * v
    }
  }
  return out.a === 0 && out.b === 0 ? null : out
}

/** Indonesian number: 19000 → "19.000", 2.5 → "2,5". */
export function idNumber(n: number): string {
  const [i, f] = Math.abs(n).toString().split('.')
  return `${n < 0 ? '−' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${f ? `,${f}` : ''}`
}

/** Right-hand side with its unit when the unit is unambiguous. */
export function rhsLabel(lin: Linear, unitX = '', unitY = ''): string {
  const n = idNumber(lin.c)
  if (unitX === 'rupiah' || unitY === 'rupiah') return `Rp${n}`
  const onlyOnes = [lin.a, lin.b].every((v) => v === 0 || Math.abs(v) === 1)
  if (unitX && unitX === unitY && onlyOnes) return `${n} ${unitX}`
  return n
}

/** Up to this many objects are drawn one by one; more are drawn as "n ×". */
export const MAX_REPEAT = 8
