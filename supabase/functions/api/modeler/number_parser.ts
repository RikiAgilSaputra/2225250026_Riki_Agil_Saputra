// Extract numbers from Indonesian text: 'Rp19.000', '19 ribu', '1,5 juta', 'dua puluh', 'selusin'.
// Port of number_parser.py. Numbers are returned as a set of exact fractions keyed by their text.
import { Frac } from "../math/frac.ts";

const UNITS: Record<string, number> = {
  nol: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6,
  tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10, sebelas: 11, seratus: 100, seribu: 1000,
};
const SCALE: Record<string, number | null> = { puluh: 10, belas: null, ratus: 100, ribu: 1000, juta: 1_000_000 };
const SPECIAL: Record<string, Frac> = {
  setengah: new Frac(1n, 2n), seperempat: new Frac(1n, 4n), selusin: new Frac(12n), lusin: new Frac(12n),
  sekodi: new Frac(20n), kodi: new Frac(20n), pasang: new Frac(2n), separuh: new Frac(1n, 2n),
};

const NUM = /(\d+(?:\.\d{3})+|\d+(?:,\d+)?)(\s*(ribu|rb|juta|jt))?/gi;

function toNumber(token: string): Frac {
  if (/^\d+(?:\.\d{3})+$/.test(token)) return new Frac(BigInt(token.replace(/\./g, "")));
  return Frac.fromDecimal(token.replace(",", "."));
}

export type FracSet = Map<string, Frac>;

function add(set: FracSet, v: Frac): void {
  set.set(v.key(), v);
}

function wordsToNumbers(text: string, found: FracSet): void {
  const tokens = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t in SPECIAL) {
      add(found, SPECIAL[t]);
      i++;
      continue;
    }
    if (t in UNITS) {
      let value = UNITS[t];
      let j = i + 1;
      while (j < tokens.length && tokens[j] in SCALE) {
        const s = tokens[j];
        value = s === "belas" ? value + 10 : value * (SCALE[s] as number);
        j++;
      }
      add(found, Frac.of(value));
      i = j;
      continue;
    }
    i++;
  }
}

export function extractNumbers(text: string): FracSet {
  const nums: FracSet = new Map();
  for (const m of text.matchAll(NUM)) {
    let value = toNumber(m[1]);
    const scale = (m[3] ?? "").toLowerCase();
    if (scale === "ribu" || scale === "rb") value = value.mul(1000);
    else if (scale === "juta" || scale === "jt") value = value.mul(1_000_000);
    add(nums, value);
    add(nums, toNumber(m[1]));
  }
  wordsToNumbers(text, nums);
  return nums;
}
