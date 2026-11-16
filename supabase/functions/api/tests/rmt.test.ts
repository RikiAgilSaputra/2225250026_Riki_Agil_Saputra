// Rigorous Mathematical Thinking (docs/15): cognitive-function tags and the logical-evidence step.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadContent } from "../services/content.ts";
import { COGNITIVE_FUNCTIONS } from "../services/progress.ts";
import { buildProblem } from "../services/step_builder.ts";

const SYSTEM = ["x - y = 1", "2*x + 3*y = 12"];

test("every method ends with a logical-evidence step on equation (2)", () => {
  for (const method of ["substitution", "elimination", "mixed", "graph"]) {
    const p = buildProblem({ pid: "t", system: SYSTEM, method });
    const last = p.steps.at(-1)!;
    assert.equal(last.cognitive_function, "logical_evidence", method);
    assert.equal(last.check, "value");
    assert.equal(last.expected, "12");
    assert.ok(last.instruction.startsWith("Bukti logis"));
    assert.equal(last.hints.length, 3);
  }
});

test("fading keeps the proof step open and counts only the solving steps", () => {
  const p = buildProblem({ pid: "t", system: SYSTEM, method: "substitution", mode: "completion", completion_blanks: 2 });
  const open = p.steps.filter((s) => !s.prefilled);
  assert.equal(open.length, 3); // two solving steps + the proof step
  assert.equal(open.at(-1)!.cognitive_function, "logical_evidence");
  const worked = buildProblem({ pid: "t", system: SYSTEM, method: "substitution", mode: "worked" });
  assert.ok(worked.steps.every((s) => s.prefilled));
});

test("story problems keep their own check against the story", () => {
  const story = {
    variables: { x: { meaning: "harga 1 buku", unit: "rupiah" }, y: { meaning: "harga 1 pensil", unit: "rupiah" } },
    equation_sources: ["2 buku dan 3 pensil", "1 buku dan 2 pensil"],
  };
  const p = buildProblem({ pid: "t", system: ["2*x + 3*y = 19000", "x + 2*y = 11000"], method: "elimination", story });
  assert.equal(p.steps.filter((s) => s.cognitive_function === "logical_evidence").length, 1);
  assert.equal(p.steps.at(-1)!.modeling_stage, 6);
  assert.equal(p.steps.find((s) => s.check === "define_variables")!.cognitive_function, "labeling");
});

test("every content step trains a known cognitive function", () => {
  const known = new Set<string>(COGNITIVE_FUNCTIONS);
  const { problems, modules } = loadContent();
  for (const p of problems.values()) {
    for (const s of p.steps) assert.ok(known.has(s.cognitive_function!), `${p.id}/${s.id}: ${s.cognitive_function}`);
  }
  for (const m of modules.values()) {
    for (const sc of m.screens as { cognitive_function?: string }[]) {
      if (sc.cognitive_function) assert.ok(known.has(sc.cognitive_function), `${m.id}: ${sc.cognitive_function}`);
    }
  }
});
