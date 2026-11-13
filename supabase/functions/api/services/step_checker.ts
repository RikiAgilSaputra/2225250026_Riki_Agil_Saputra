// Checks one step answer and classifies the error (docs/04-LEARNING-DESIGN.md §8).
// Port of apps/api/app/services/step_checker.py.
import type { Frac } from "../math/frac.ts";
import * as mp from "../math/mathparse.ts";
import type { Poly } from "../math/mathparse.ts";
import type { Step } from "./types.ts";

export const FEEDBACK: Record<string, string> = {
  SIGN_ERROR: "Periksa tanda saat memindahkan suku ke ruas lain.",
  ARITH_ERROR: "Caramu sudah benar. Periksa lagi hitunganmu.",
  VAR_SWAP: "Nilai x dan y tertukar. Lihat label warnanya.",
  PARTIAL_MULTIPLY: "Kalikan semua suku di kedua ruas.",
  NOT_SCALED: "Kalikan dulu dengan bilangan yang diminta.",
  WRONG_VAR: "Yang ditanya variabel lain. Baca lagi instruksinya.",
  FORMAT: "Tulis dalam bentuk seperti: y = 7 − 2x",
  TOO_LONG: "Jawabanmu terlalu panjang.",
  MODEL_REVERSED: "Siapa yang lebih besar? Baca lagi kalimatnya.",
  WRONG_CHOICE: "Belum tepat. Coba baca lagi ceritanya.",
  SPANS: "Masih ada bagian cerita yang belum tepat ditandai.",
  UNKNOWN: "Belum tepat. Coba lihat petunjuk.",
};

export interface CheckResult {
  correct: boolean;
  error_code: string | null;
  feedback: string;
}

function result(correct: boolean, code: string | null = null): CheckResult {
  return {
    correct,
    error_code: correct ? null : code,
    feedback: correct ? "Benar!" : FEEDBACK[code ?? "UNKNOWN"] ?? FEEDBACK.UNKNOWN,
  };
}

function classifyEquation(ansL: Poly, ansR: Poly, expL: Poly, expR: Poly): string {
  const ans = mp.equationVector(ansL, ansR);
  const exp = mp.equationVector(expL, expR);
  if (ans === null || exp === null) return "UNKNOWN";
  // Sign error: flipping the sign of exactly one term makes it right
  for (let i = 0; i < 3; i++) {
    const flipped = [...ans];
    flipped[i] = flipped[i].neg();
    if (!flipped[i].isZero() && mp.proportional(flipped, exp)) return "SIGN_ERROR";
  }
  // Variables swapped
  if (mp.proportional([ans[1], ans[0], ans[2]], exp)) return "VAR_SWAP";
  // Multiplied only one side: compare sides separately
  const al = mp.linearCoeffs(ansL);
  const ar = mp.linearCoeffs(ansR);
  const el = mp.linearCoeffs(expL);
  const er = mp.linearCoeffs(expR);
  if (al && ar && el && er) {
    const lEq = mp.vecEq(al, el);
    const rEq = mp.vecEq(ar, er);
    if ((lEq && !rEq) || (rEq && !lEq)) {
      if (mp.proportional(al, el) && mp.proportional(ar, er)) return "PARTIAL_MULTIPLY";
    }
  }
  // Right structure (same x/y ratio), wrong constant
  if (!(ans[0].isZero() && ans[1].isZero()) && mp.proportional([ans[0], ans[1]], [exp[0], exp[1]])) {
    return "ARITH_ERROR";
  }
  return "UNKNOWN";
}

export function checkStep(step: Step, answer: unknown): CheckResult {
  const kind = step.check;
  const expected = step.expected;
  if (typeof answer === "string" && answer.length > mp.MAX_LEN) return result(false, "TOO_LONG");
  try {
    if (kind === "equation_scaled") {
      // The equation must be multiplied exactly as instructed (k = ±1 only).
      if (typeof answer !== "string") return result(false, "FORMAT");
      const [al, ar] = mp.parseEquation(answer);
      const [el, er] = mp.parseEquation(String(expected));
      const av = mp.equationVector(al, ar);
      const ev = mp.equationVector(el, er);
      if (av === null) return result(false, "UNKNOWN");
      if (ev !== null && (mp.vecEq(av, ev) || mp.vecEq(av.map((t) => t.neg()), ev))) return result(true);
      if (ev !== null && mp.proportional(av, ev)) return result(false, "NOT_SCALED");
      return result(false, classifyEquation(al, ar, el, er));
    }

    if (kind === "equation_equivalent" || kind === "expression_equivalent") {
      if (typeof answer !== "string") return result(false, "FORMAT");
      if (kind === "expression_equivalent") {
        const a = mp.parseExpression(answer);
        const e = mp.parseExpression(String(expected));
        const ok = a.sub(e).isZero();
        return result(ok, ok ? null : "UNKNOWN");
      }
      const [al, ar] = mp.parseEquation(answer);
      const [el, er] = mp.parseEquation(String(expected));
      const av = mp.equationVector(al, ar);
      const ev = mp.equationVector(el, er);
      if (av === null) return result(false, "UNKNOWN");
      if (ev !== null && mp.proportional(av, ev)) return result(true);
      return result(false, classifyEquation(al, ar, el, er));
    }

    if (kind === "value") {
      if (typeof answer !== "string") return result(false, "FORMAT");
      const variable = step.variable;
      const norm = mp.normalize(answer);
      if (norm.includes("=") && variable) {
        const left = norm.split("=")[0].trim();
        if ((left === "x" || left === "y") && left !== variable) return result(false, "WRONG_VAR");
      }
      let value: Frac;
      try {
        value = mp.parseNumber(answer);
      } catch (e) {
        // e.g. "1/0": a number, just never the right one (SymPy: zoo)
        if (e instanceof mp.ZeroDivision) return result(false, "ARITH_ERROR");
        throw e;
      }
      const target = mp.parseNumber(String(expected));
      if (value.eq(target)) return result(true);
      const other = step.other_value;
      if (other !== undefined && other !== null && value.eq(mp.parseNumber(String(other)))) {
        return result(false, "VAR_SWAP");
      }
      if (value.eq(target.neg())) return result(false, "SIGN_ERROR");
      return result(false, "ARITH_ERROR");
    }

    if (kind === "point") {
      if (typeof answer !== "string") return result(false, "FORMAT");
      const [px, py] = mp.parsePoint(answer);
      const [ex, ey] = (expected as unknown[]).map((v) => mp.parseNumber(String(v))) as [Frac, Frac];
      if (px.eq(ex) && py.eq(ey)) return result(true);
      if (px.eq(ey) && py.eq(ex)) return result(false, "VAR_SWAP");
      return result(false, "UNKNOWN");
    }

    if (kind === "choice" || kind === "define_variables" || kind === "interpret" || kind === "reasonableness") {
      const ok = pyStr(answer) === pyStr(expected);
      return result(ok, ok ? null : (step.wrong_code ?? "WRONG_CHOICE"));
    }

    if (kind === "highlight_spans") {
      // expected: {segment_id: tag}; tags: known | asked | irrelevant. Untagged = "".
      if (typeof answer !== "object" || answer === null || Array.isArray(answer)) return result(false, "FORMAT");
      const given = answer as Record<string, unknown>;
      const ok = Object.entries(expected as Record<string, string>).every(([seg, tag]) => (given[seg] ?? "") === tag);
      return result(ok, ok ? null : "SPANS");
    }
  } catch (e) {
    if (e instanceof mp.ParseError) return result(false, e.code in FEEDBACK ? e.code : "FORMAT");
    if (e instanceof RangeError) return result(false, "FORMAT");
    throw e;
  }
  throw new Error(`Unknown check type: ${kind}`);
}

/** str() of a JSON value as Python would print it, enough for comparing choice ids. */
function pyStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null || v === undefined) return "None";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}
