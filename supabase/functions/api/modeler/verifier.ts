// Deterministic verification of an AI model (docs/14 §6, checks V1–V7). Port of verifier.py.
// The AI only translates; nothing it computes is trusted. A model is used only if it passes every check.
import { Frac } from "../math/frac.ts";
import * as mp from "../math/mathparse.ts";
import { parseSystem, solveSystem, type Eq } from "../services/step_builder.ts";
import { extractNumbers, type FracSet } from "./number_parser.ts";
import type { WordProblemModel } from "./schema.ts";
import { ratio } from "./sequence_matcher.ts";

// General knowledge the model may use without the number appearing in the text (V3)
const KNOWLEDGE = [0, 1, 2, 3, 4, 10, 12, 100].map((n) => Frac.of(n));

export interface Verification {
  ok: boolean;
  special: boolean; // V5: no unique solution
  problems: string[];
  solution: { x: string; y: string } | null;
  target_value: string | null;
  system: string[] | null;
  checks: Record<string, boolean>;
}

function norm(s: string): string {
  s = s.toLowerCase().replace(/−/g, "-");
  s = s.replace(/[^\p{L}\p{N}_\s]/gu, " ");
  return s.replace(/\s+/gu, " ").trim();
}

export function sourceFound(source: string, text: string): boolean {
  const src = norm(source);
  const txt = norm(text);
  if (!src) return false;
  if (txt.includes(src)) return true;
  const words = txt.split(" ").filter(Boolean);
  const n = src.split(" ").filter(Boolean).length;
  let best = 0;
  for (let i = 0; i < Math.max(1, words.length - n + 1); i++) {
    best = Math.max(best, ratio(src, words.slice(i, i + n).join(" ")));
  }
  return best >= 0.9;
}

function constants(eq: string): FracSet {
  const [lhs, rhs] = mp.parseEquation(eq);
  const out: FracSet = new Map();
  for (const side of [lhs, rhs]) {
    for (const v of mp.linearCoeffs(side) ?? []) if (!v.isZero()) out.set(v.abs().key(), v.abs());
  }
  // Constants inside brackets like (x + 5) are also checked
  for (const tok of eq.match(/\d+(?:\.\d+)?/g) ?? []) {
    const f = Frac.fromDecimal(tok);
    out.set(f.key(), f);
  }
  return out;
}

function allowedNumbers(text: string): FracSet {
  const base: FracSet = extractNumbers(text);
  for (const k of KNOWLEDGE) base.set(k.key(), k);
  const derived: FracSet = new Map(base);
  const vals = [...base.values()];
  for (const a of vals) {
    for (const b of vals) {
      for (const v of [a.mul(b), a.add(b)]) derived.set(v.key(), v);
      if (a.gt(b)) derived.set(a.sub(b).key(), a.sub(b));
      if (!b.isZero()) derived.set(a.div(b).key(), a.div(b));
    }
  }
  return derived;
}

export function verify(model: WordProblemModel, text: string): Verification {
  const v: Verification = {
    ok: false, special: false, problems: [], solution: null, target_value: null, system: null, checks: {},
  };
  // V1: exactly two variables x, y and two parseable equations
  const symbols = model.variables.map((x) => x.symbol).sort();
  if (symbols.join(",") !== "x,y" || model.equations.length !== 2) {
    v.problems.push("Harus ada tepat dua variabel (x dan y) dan dua persamaan.");
    return v;
  }
  let eqs: Eq[];
  try {
    eqs = parseSystem(model.equations.map((e) => e.equation));
    v.checks.V1 = true;
  } catch {
    v.problems.push("Persamaan tidak dapat dibaca atau tidak linear; tulis dengan * eksplisit.");
    v.checks.V1 = false;
    return v;
  }
  v.checks.V2 = true; // parseSystem rejects non-linear equations
  // V3: number trace
  const allowed = allowedNumbers(text);
  const stray: FracSet = new Map();
  for (const e of model.equations) {
    for (const [key, c] of constants(e.equation)) if (!allowed.has(key)) stray.set(key, c);
  }
  v.checks.V3 = stray.size === 0;
  if (stray.size) {
    const sorted = [...stray.values()].sort((a, b) => a.cmp(b));
    v.problems.push("Ada angka yang tidak berasal dari soal: " + sorted.map(String).join(", ") + ".");
  }
  // V4: each source quote really appears in the text
  const missing = model.equations.filter((e) => !sourceFound(e.source_text, text)).map((e) => e.source_text);
  v.checks.V4 = missing.length === 0;
  if (missing.length) v.problems.push("Kutipan sumber tidak ditemukan persis di soal: " + missing.join(" | "));
  // V7: target is an expression of x, y
  let target: mp.Poly | null = null;
  try {
    target = mp.parseExpression(model.target);
    v.checks.V7 = true;
  } catch {
    v.checks.V7 = false;
    v.problems.push("target harus berupa ekspresi dalam x dan y.");
  }
  v.system = eqs.map(([a, b, c]) => `(${a})*x + (${b})*y = ${c}`);
  // V5: unique solution
  const sol = solveSystem(eqs);
  if (sol === null) {
    v.special = true;
    v.checks.V5 = false;
    v.ok = v.problems.length === 0;
    return v;
  }
  v.checks.V5 = true;
  v.solution = { x: sol.x.toString(), y: sol.y.toString() };
  // V6: plausibility
  const implausible: string[] = [];
  for (const variable of model.variables) {
    const val = sol[variable.symbol];
    if (variable.must_be_positive && val.le(0)) implausible.push(`${variable.meaning} = ${val} (harus positif)`);
    if (variable.must_be_integer && !val.isInteger()) implausible.push(`${variable.meaning} = ${val} (harus bilangan bulat)`);
  }
  v.checks.V6 = implausible.length === 0;
  if (implausible.length) v.problems.push("Hasil tidak masuk akal: " + implausible.join("; ") + ".");
  if (target !== null) v.target_value = target.evalAt(sol.x, sol.y)?.toString() ?? null;
  v.ok = v.problems.length === 0;
  return v;
}
