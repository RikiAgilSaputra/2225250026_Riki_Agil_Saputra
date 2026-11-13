// Exact rational numbers (replaces SymPy Rational / Python Fraction). BigInt keeps student input exact.

function bigAbs(a: bigint): bigint {
  return a < 0n ? -a : a;
}

export function gcdBig(a: bigint, b: bigint): bigint {
  a = bigAbs(a);
  b = bigAbs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export class Frac {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new RangeError("division by zero");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcdBig(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }

  static of(v: number | bigint | Frac): Frac {
    if (v instanceof Frac) return v;
    if (typeof v === "bigint") return new Frac(v);
    if (!Number.isInteger(v)) throw new RangeError(`not an integer: ${v}`);
    return new Frac(BigInt(v));
  }

  /** Exact value of a decimal literal such as "12", "1.5", ".25". */
  static fromDecimal(s: string): Frac {
    const m = /^(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m || (m[1] === "" && (m[2] ?? "") === "")) throw new RangeError(`bad number: ${s}`);
    const frac = m[2] ?? "";
    return new Frac(BigInt((m[1] || "0") + frac), 10n ** BigInt(frac.length));
  }

  add(o: Frac | number): Frac {
    const b = Frac.of(o);
    return new Frac(this.n * b.d + b.n * this.d, this.d * b.d);
  }
  sub(o: Frac | number): Frac {
    return this.add(Frac.of(o).neg());
  }
  mul(o: Frac | number): Frac {
    const b = Frac.of(o);
    return new Frac(this.n * b.n, this.d * b.d);
  }
  div(o: Frac | number): Frac {
    const b = Frac.of(o);
    return new Frac(this.n * b.d, this.d * b.n);
  }
  neg(): Frac {
    return new Frac(-this.n, this.d);
  }
  abs(): Frac {
    return this.n < 0n ? this.neg() : this;
  }
  isZero(): boolean {
    return this.n === 0n;
  }
  isInteger(): boolean {
    return this.d === 1n;
  }
  sign(): number {
    return this.n > 0n ? 1 : this.n < 0n ? -1 : 0;
  }
  eq(o: Frac | number): boolean {
    const b = Frac.of(o);
    return this.n === b.n && this.d === b.d;
  }
  cmp(o: Frac | number): number {
    const b = Frac.of(o);
    const l = this.n * b.d;
    const r = b.n * this.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  lt(o: Frac | number): boolean {
    return this.cmp(o) < 0;
  }
  le(o: Frac | number): boolean {
    return this.cmp(o) <= 0;
  }
  gt(o: Frac | number): boolean {
    return this.cmp(o) > 0;
  }
  /** Same text as str(sympy.Rational) / str(fractions.Fraction): "3", "-7/2". */
  toString(): string {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }
  key(): string {
    return this.toString();
  }
  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }
}

export const ZERO = new Frac(0n);
export const ONE = new Frac(1n);
