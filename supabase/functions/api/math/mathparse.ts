// Safe parsing of student math input (port of apps/api/app/services/mathparse.py, which used SymPy).
//
// Only digits, x, y, + - * / ( ) = . , and spaces are accepted, checked with a whitelist before
// parsing. Expressions are exact polynomials in x and y with rational coefficients; dividing by an
// expression that contains x or y gives a "non-polynomial" value, which is never linear.
import { Frac, ONE, ZERO } from "./frac.ts";

export const MAX_LEN = 120;
const ALLOWED = /^[0-9xy+\-*/().=,\s]*$/;
const MAX_POWER = 64;

export class ParseError extends Error {
  readonly code: "FORMAT" | "TOO_LONG";
  constructor(code: "FORMAT" | "TOO_LONG") {
    super(code);
    this.code = code;
  }
}

/** Division by zero (SymPy gives zoo): a parseable but impossible value. */
export class ZeroDivision extends Error {
  constructor() {
    super("division by zero");
  }
}

/** Polynomial in x, y: monomial "i,j" (x^i y^j) -> coefficient. `rational` marks a non-polynomial result. */
export class Poly {
  readonly terms: Map<string, Frac>;
  readonly rational: boolean;

  constructor(terms: Map<string, Frac> = new Map(), rational = false) {
    const clean = new Map<string, Frac>();
    for (const [k, v] of terms) if (!v.isZero()) clean.set(k, v);
    this.terms = clean;
    this.rational = rational;
  }

  static const(v: Frac | number): Poly {
    return new Poly(new Map([["0,0", Frac.of(v)]]));
  }
  static variable(name: "x" | "y"): Poly {
    return new Poly(new Map([[name === "x" ? "1,0" : "0,1", ONE]]));
  }
  static nonPolynomial(): Poly {
    return new Poly(new Map(), true);
  }

  coeff(i: number, j: number): Frac {
    return this.terms.get(`${i},${j}`) ?? ZERO;
  }
  hasSymbols(): boolean {
    if (this.rational) return true;
    for (const k of this.terms.keys()) if (k !== "0,0") return true;
    return false;
  }
  constValue(): Frac | null {
    return this.hasSymbols() ? null : this.coeff(0, 0);
  }
  isZero(): boolean {
    return !this.rational && this.terms.size === 0;
  }

  add(o: Poly): Poly {
    if (this.rational || o.rational) return Poly.nonPolynomial();
    const t = new Map(this.terms);
    for (const [k, v] of o.terms) t.set(k, (t.get(k) ?? ZERO).add(v));
    return new Poly(t);
  }
  neg(): Poly {
    if (this.rational) return this;
    return new Poly(new Map([...this.terms].map(([k, v]) => [k, v.neg()])));
  }
  sub(o: Poly): Poly {
    return this.add(o.neg());
  }
  mul(o: Poly): Poly {
    if (this.rational || o.rational) return Poly.nonPolynomial();
    const t = new Map<string, Frac>();
    for (const [k1, v1] of this.terms) {
      const [i1, j1] = k1.split(",").map(Number);
      for (const [k2, v2] of o.terms) {
        const [i2, j2] = k2.split(",").map(Number);
        const k = `${i1 + i2},${j1 + j2}`;
        t.set(k, (t.get(k) ?? ZERO).add(v1.mul(v2)));
      }
    }
    return new Poly(t);
  }
  /** Division: by a non-zero constant stays a polynomial; by an expression in x/y does not. */
  div(o: Poly): Poly {
    const c = o.constValue();
    if (c === null) return Poly.nonPolynomial();
    if (c.isZero()) throw new ZeroDivision();
    return this.mul(Poly.const(ONE.div(c)));
  }
  pow(e: Poly): Poly {
    const k = e.constValue();
    if (k === null || !k.isInteger()) return Poly.nonPolynomial();
    const n = Number(k.n);
    if (Math.abs(n) > MAX_POWER) throw new ParseError("FORMAT");
    if (n < 0) {
      const base = this.constValue();
      if (base === null) return Poly.nonPolynomial();
      return Poly.const(ONE).div(Poly.const(base)).pow(Poly.const(-n));
    }
    let out = Poly.const(ONE);
    for (let i = 0; i < n; i++) out = out.mul(this);
    return out;
  }
  /** Value at x, y (null for non-polynomial values). */
  evalAt(x: Frac, y: Frac): Frac | null {
    if (this.rational) return null;
    let s = ZERO;
    for (const [k, v] of this.terms) {
      const [i, j] = k.split(",").map(Number);
      let term = v;
      for (let a = 0; a < i; a++) term = term.mul(x);
      for (let b = 0; b < j; b++) term = term.mul(y);
      s = s.add(term);
    }
    return s;
  }
}

// ------------------------------------------------------------------ parser
type Tok = { t: "num"; v: Frac } | { t: "var"; v: "x" | "y" } | { t: "op"; v: string };

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const num = /^(\d+(?:\.\d*)?|\.\d+)/.exec(s.slice(i));
    if (num) {
      out.push({ t: "num", v: Frac.fromDecimal(num[1]) });
      i += num[1].length;
      continue;
    }
    if (ch === "x" || ch === "y") {
      out.push({ t: "var", v: ch });
      i++;
      continue;
    }
    if (s.startsWith("**", i)) {
      out.push({ t: "op", v: "**" });
      i += 2;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      out.push({ t: "op", v: ch });
      i++;
      continue;
    }
    throw new ParseError("FORMAT");
  }
  return out;
}

class Parser {
  private i = 0;
  private readonly toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }

  private peek(): Tok | undefined {
    return this.toks[this.i];
  }
  private isOp(v: string): boolean {
    const t = this.peek();
    return t !== undefined && t.t === "op" && t.v === v;
  }
  private startsAtom(): boolean {
    const t = this.peek();
    return t !== undefined && (t.t === "num" || t.t === "var" || (t.t === "op" && t.v === "("));
  }

  parse(): Poly {
    if (this.toks.length === 0) throw new ParseError("FORMAT");
    const e = this.expr();
    if (this.i !== this.toks.length) throw new ParseError("FORMAT");
    return e;
  }
  private expr(): Poly {
    let left = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const op = (this.toks[this.i++] as { v: string }).v;
      const right = this.term();
      left = op === "+" ? left.add(right) : left.sub(right);
    }
    return left;
  }
  private term(): Poly {
    let left = this.unary();
    for (;;) {
      if (this.isOp("*") || this.isOp("/")) {
        const op = (this.toks[this.i++] as { v: string }).v;
        const right = this.unary();
        left = op === "*" ? left.mul(right) : left.div(right);
      } else if (this.startsAtom()) {
        left = left.mul(this.power()); // implicit multiplication: 2x, 2(x + 1), xy
      } else {
        return left;
      }
    }
  }
  private unary(): Poly {
    if (this.isOp("-")) {
      this.i++;
      return this.unary().neg();
    }
    if (this.isOp("+")) {
      this.i++;
      return this.unary();
    }
    return this.power();
  }
  private power(): Poly {
    const base = this.atom();
    if (this.isOp("**")) {
      this.i++;
      return base.pow(this.unary());
    }
    return base;
  }
  private atom(): Poly {
    const t = this.toks[this.i++];
    if (t === undefined) throw new ParseError("FORMAT");
    if (t.t === "num") return Poly.const(t.v);
    if (t.t === "var") return Poly.variable(t.v);
    if (t.v === "(") {
      const e = this.expr();
      if (!this.isOp(")")) throw new ParseError("FORMAT");
      this.i++;
      return e;
    }
    throw new ParseError("FORMAT");
  }
}

// ------------------------------------------------------------------ public API
const REPLACEMENTS: [string, string][] = [
  ["−", "-"], ["–", "-"], ["—", "-"], ["×", "*"], ["·", "*"], ["÷", "/"], [":", "/"],
  ["X", "x"], ["Y", "y"], ["Rp", ""], ["rp", ""],
];

export function normalize(raw: string): string {
  let s = raw.trim();
  for (const [a, b] of REPLACEMENTS) s = s.split(a).join(b);
  // Indonesian thousands separator "19.000" -> 19000 (dot followed by exactly 3 digits)
  return s.replace(/(?<=\d)\.(?=\d{3}(?!\d))/g, "");
}

function decimalCommas(s: string): string {
  return s.replace(/(?<=\d),(?=\d)/g, ".");
}

export function parseExpression(raw: string): Poly {
  const s = decimalCommas(normalize(raw));
  if (s.length > MAX_LEN) throw new ParseError("TOO_LONG");
  if (!s || !ALLOWED.test(s) || s.includes("=") || s.includes(",")) throw new ParseError("FORMAT");
  try {
    return new Parser(tokenize(s)).parse();
  } catch (e) {
    if (e instanceof ParseError || e instanceof ZeroDivision) throw e;
    throw new ParseError("FORMAT");
  }
}

export function parseEquation(raw: string): [Poly, Poly] {
  const s = normalize(raw);
  const parts = s.split("=");
  if (parts.length !== 2) throw new ParseError("FORMAT");
  return [parseExpression(parts[0]), parseExpression(parts[1])];
}

/** Accepts '3', '-2', '7/2', '3,5', 'x = 3' (left side ignored by caller). */
export function parseNumber(raw: string): Frac {
  let s = normalize(raw);
  if (s.includes("=")) s = s.split("=").at(-1) ?? "";
  const v = parseExpression(s).constValue();
  if (v === null) throw new ParseError("FORMAT");
  return v;
}

function stripChars(s: string, chars: string): string {
  let a = 0;
  let b = s.length;
  while (a < b && chars.includes(s[a])) a++;
  while (b > a && chars.includes(s[b - 1])) b--;
  return s.slice(a, b);
}

export function parsePoint(raw: string): [Frac, Frac] {
  let s = normalize(raw).trim();
  s = stripChars(s, "()").trim();
  // Points use ";" or "," as separator; allow "3, 1" and "3;1"
  const commas = s.split(",").length - 1;
  const parts = s.includes(";") || s.includes(", ") || commas === 1 ? s.split(/\s*[;,]\s*/) : [];
  if (parts.length !== 2) throw new ParseError("FORMAT");
  return [parseNumber(parts[0]), parseNumber(parts[1])];
}

export type Vec3 = [Frac, Frac, Frac];

/** (a, b, c) for a*x + b*y + c, or null if the expression is not linear. */
export function linearCoeffs(e: Poly): Vec3 | null {
  if (e.rational) return null;
  for (const k of e.terms.keys()) if (k !== "0,0" && k !== "1,0" && k !== "0,1") return null;
  return [e.coeff(1, 0), e.coeff(0, 1), e.coeff(0, 0)];
}

/** Equation lhs = rhs as vector (a, b, c) meaning a*x + b*y + c = 0. */
export function equationVector(lhs: Poly, rhs: Poly): Vec3 | null {
  return linearCoeffs(lhs.sub(rhs));
}

/** True if vectors u and v are non-zero scalar multiples of each other. */
export function proportional(u: Frac[], v: Frac[]): boolean {
  if (u.every((t) => t.isZero()) || v.every((t) => t.isZero())) return false;
  let k: Frac | null = null;
  for (let i = 0; i < u.length; i++) {
    const a = u[i];
    const b = v[i];
    if (a.isZero() && b.isZero()) continue;
    if (a.isZero() || b.isZero()) return false;
    const r = a.div(b);
    if (k === null) k = r;
    else if (!r.eq(k)) return false;
  }
  return true;
}

export function vecEq(u: Frac[], v: Frac[]): boolean {
  return u.length === v.length && u.every((t, i) => t.eq(v[i]));
}

function groupThousands(n: bigint): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Display number with Unicode minus and Indonesian thousands dots: "−7/2", "19.000". */
export function fmtNumber(v: Frac): string {
  const sign = v.sign() < 0 ? "−" : ""; // typographic minus for display only
  const a = v.abs();
  if (a.isInteger()) return sign + (a.n >= 1000n ? groupThousands(a.n) : a.n.toString());
  return `${sign}${a.n}/${a.d}`;
}

/** Pretty print a*x + b*y (+ c) [= rhs] with Unicode minus. */
export function fmtLinear(a: Frac, b: Frac, c: Frac = ZERO, rhs?: Frac | string): string {
  const parts: string[] = [];
  for (const [coef, name] of [[a, "x"], [b, "y"]] as [Frac, string][]) {
    if (coef.isZero()) continue;
    const sign = coef.sign() < 0 ? "−" : "+";
    const mag = coef.abs();
    const body = mag.eq(1) ? name : `${fmtNumber(mag)}${name}`;
    parts.push(!parts.length && sign === "+" ? body : !parts.length ? `−${body}` : ` ${sign} ${body}`);
  }
  if (!c.isZero() || !parts.length) {
    const sign = c.sign() < 0 ? "−" : "+";
    const mag = fmtNumber(c.abs());
    parts.push(!parts.length && sign === "+" ? mag : !parts.length ? `−${mag}` : ` ${sign} ${mag}`);
  }
  const s = parts.join("");
  if (rhs === undefined) return s;
  return `${s} = ${typeof rhs === "string" ? rhs : fmtNumber(rhs)}`;
}
