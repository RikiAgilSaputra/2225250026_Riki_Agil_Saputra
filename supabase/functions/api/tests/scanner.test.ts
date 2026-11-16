// Problem scanner: story vs. equations vs. other, without AI (docs/14 §12).
import assert from "node:assert/strict";
import { test } from "node:test";
import { findEquations, scanText } from "../services/scanner.ts";
import { buildProblem } from "../services/step_builder.ts";

test("story problems are detected", () => {
  for (const t of [
    "Harga 2 buku dan 3 pensil Rp19.000. Harga 1 buku dan 2 pensil Rp11.000. Berapa harga 1 buku?",
    "Di kandang ada ayam dan kambing sebanyak tiga puluh ekor. Jumlah kakinya delapan puluh. Berapa banyak kambing?",
    "Umur ayah sekarang 3 kali umur anaknya. Lima tahun lagi, jumlah umur mereka 58 tahun.",
  ]) {
    const r = scanText(t);
    assert.equal(r.kind, "story", t);
  }
});

test("SPLDV written as equations is detected and solvable", () => {
  for (const t of [
    "2x + y = 7\nx − y = 2",
    "Tentukan penyelesaian dari 2x + y = 7 dan x - y = 2.",
    "(1) 2x + 3y = 12\n(2) x - y = 1",
    "1. 4x + 2y = 14; 2. x + y = 4",
    "{ 2x + y = 7, x − y = 2 }",
    "Diketahui sistem persamaan 3x + 2y = 21000 dan 2x + 4y = 22000. Tentukan nilai x dan y!",
  ]) {
    const r = scanText(t);
    assert.equal(r.kind, "equations", t);
    assert.equal(r.solvable, true, t);
    assert.equal(r.system?.length, 2);
    // The system is accepted by the step builder (what POST /attempts {system} does)
    assert.ok(buildProblem({ pid: "scan-t", system: r.system!, method: "mixed", source: "scan" }).steps.length > 2);
  }
  assert.deepEqual(scanText("2x + y = 7\nx − y = 2").equations, ["2x + y = 7", "x − y = 2"]);
});

test("special and non-SPLDV cases", () => {
  const parallel = scanText("x + y = 5\n2x + 2y = 7");
  assert.equal(parallel.kind, "equations");
  assert.equal(parallel.solvable, false);
  assert.equal(scanText("2x + 5 = 11").kind, "other");
  assert.equal(scanText("x + y = 5\nx - y = 1\n2x + y = 8").kind, "other");
  assert.equal(scanText("Selamat pagi semuanya").kind, "other");
  assert.equal(scanText("").kind, "other");
});

test("findEquations ignores labels, numbers and duplicates", () => {
  assert.equal(findEquations("Persamaan (1): 2x + y = 7. Persamaan (2): 2x + y = 7").length, 1);
  assert.equal(findEquations("Harga Rp19.000 dan 2 = 2").length, 0);
  assert.deepEqual(findEquations("x = 2y\ny = 3")[0].display, "x − 2y = 0");
});
