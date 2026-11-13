// Step checker (docs/11 §3, SC-01..SC-11) and step builder self-consistency. Port of tests/test_math.py.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadContent } from "../services/content.ts";
import { generate, Rng } from "../services/generator.ts";
import { buildProblem } from "../services/step_builder.ts";
import { checkStep } from "../services/step_checker.ts";
import type { Problem, Step } from "../services/types.ts";

const E = "equation_equivalent";
const st = (s: Partial<Step>) => ({ id: "s1", instruction: "", hints: [], ...s }) as Step;

const CASES: [Partial<Step>, unknown, boolean, string | null][] = [
  [{ check: E, expected: "y = 7 - 2*x" }, "y=7-2x", true, null], // SC-01
  [{ check: E, expected: "y = 7 - 2*x" }, "2x + y = 7", true, null], // SC-02
  [{ check: E, expected: "y = 7 - 2*x" }, "y = 7 + 2x", false, "SIGN_ERROR"], // SC-03
  [{ check: E, expected: "6*x + 3*y = 21" }, "6x + 3y = 7", false, "PARTIAL_MULTIPLY"], // SC-04
  [{ check: "value", expected: "3", variable: "x" }, "x = 3.0", true, null], // SC-05
  [{ check: "value", expected: "1/2", variable: "x" }, "x = 0,5", true, null], // SC-06
  [{ check: "point", expected: ["3", "1"] }, "(1, 3)", false, "VAR_SWAP"], // SC-07
  [{ check: E, expected: "y = 7 - 2*x" }, "__import__('os')", false, "FORMAT"], // SC-08
  [{ check: E, expected: "y = 7 - 2*x" }, "x".repeat(121), false, "TOO_LONG"], // SC-09
  [{ check: E, expected: "y = 7 - 2*x" }, "x**99999999", false, "FORMAT"], // SC-10
  [{ check: E, expected: "y = 7 - 2*x" }, "y = 7 − 2x", true, null], // SC-11
  [{ check: E, expected: "2*x + 3*y = 19000" }, "2x + 3y = 19.000", true, null],
  [{ check: "equation_scaled", expected: "4*x + 2*y = 14" }, "2x + y = 7", false, "NOT_SCALED"],
  [{ check: "value", expected: "3", variable: "x" }, "y = 3", false, "WRONG_VAR"],
  [{ check: "value", expected: "3", variable: "x" }, "1/0", false, "ARITH_ERROR"],
  [{ check: "highlight_spans", expected: { a: "known", b: "asked" } }, { a: "known", b: "asked" }, true, null],
];

test("check_step cases", () => {
  for (const [step, answer, correct, code] of CASES) {
    const r = checkStep(st(step), answer);
    assert.equal(r.correct, correct, `${JSON.stringify(step)} ${String(answer)}`);
    assert.equal(r.error_code, code, `${JSON.stringify(step)} ${String(answer)}`);
  }
});

function selfCheck(problem: Problem): void {
  for (const s of problem.steps) {
    const exp = s.expected as string | string[];
    const ans = s.check === "point" ? `(${exp[0]}, ${exp[1]})` : exp;
    assert.ok(checkStep(s, ans).correct, `${problem.id} ${JSON.stringify(s)}`);
  }
}

test("builder: random systems, every method", () => {
  const r = new Rng(7);
  const nz = () => r.choice([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
  for (let i = 0; i < 80; i++) {
    const [X, Y] = [r.int(-9, 9), r.int(-9, 9)];
    const [a1, b1, a2, b2] = [nz(), nz(), nz(), nz()];
    if (a1 * b2 - a2 * b1 === 0) continue;
    const system = [`${a1}*x + ${b1}*y = ${a1 * X + b1 * Y}`, `${a2}*x + ${b2}*y = ${a2 * X + b2 * Y}`];
    for (const method of ["substitution", "elimination", "mixed", "graph"]) {
      const p = buildProblem({ pid: "t", system, method });
      assert.deepEqual(p.solution, { x: String(X), y: String(Y) });
      selfCheck(p);
    }
  }
});

test("generator: every template", () => {
  for (const template of ["graph", "substitution", "elimination", "mixed", "story"]) {
    for (let seed = 0; seed < 40; seed++) selfCheck(generate(template, seed));
  }
});

test("all content answer keys are consistent and have 3 hints", () => {
  for (const p of loadContent().problems.values()) {
    selfCheck(p);
    for (const s of p.steps) assert.equal(s.hints.length, 3, `${p.id} ${s.id}`);
  }
});
