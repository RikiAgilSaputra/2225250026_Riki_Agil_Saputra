// Modeler verifier without calling the real API (docs/11 §3a, MV-01..MV-10). Port of tests/test_modeler.py.
import assert from "node:assert/strict";
import { test } from "node:test";
import { maskPii } from "../modeler/guard.ts";
import { extractNumbers } from "../modeler/number_parser.ts";
import { verify } from "../modeler/verifier.ts";
import { KAKI, makeModel, TEXT } from "./fixtures.ts";

const ternak = [
  { symbol: "x" as const, meaning: "banyak ayam", unit: "ekor", must_be_positive: true, must_be_integer: true },
  { symbol: "y" as const, meaning: "banyak kambing", unit: "ekor", must_be_positive: true, must_be_integer: true },
];

test("MV-01 verified", () => {
  const v = verify(makeModel(["2*x + 3*y = 19000", "x + 2*y = 11000"]), TEXT);
  assert.ok(v.ok);
  assert.deepEqual(v.solution, { x: "5000", y: "3000" });
  assert.equal(v.target_value, "5000");
});

test("MV-02 non-linear", () => {
  assert.ok(!verify(makeModel(["x*y = 19000", "x + 2*y = 11000"]), TEXT).ok);
});

test("MV-03 number trace", () => {
  const v = verify(makeModel(["2*x + 3*y = 21000", "x + 2*y = 11000"]), TEXT);
  assert.ok(!v.ok && v.checks.V3 === false);
});

test("MV-04 source not found", () => {
  const v = verify(makeModel(["2*x + 3*y = 19000", "x + 2*y = 11000"], {
    sources: ["Harga 2 buku dan 3 pensil Rp19.000", "Ani membeli banyak permen"],
  }), TEXT);
  assert.ok(!v.ok && v.checks.V4 === false);
});

test("MV-05 must be integer", () => {
  const text = "Ada ayam dan kambing sebanyak 30 ekor. Jumlah kakinya 81. Berapa banyak kambing?";
  const v = verify(makeModel(["x + y = 30", "2*x + 4*y = 81"], {
    sources: ["ayam dan kambing sebanyak 30 ekor", "Jumlah kakinya 81"], variables: ternak, target: "y",
  }), text);
  assert.ok(!v.ok && v.checks.V6 === false);
});

test("MV-06 parallel lines are special", () => {
  const text = "Harga 1 buku dan 1 pensil Rp5.000. Harga 2 buku dan 2 pensil Rp10.000.";
  const v = verify(makeModel(["x + y = 5000", "2*x + 2*y = 10000"], {
    sources: ["Harga 1 buku dan 1 pensil Rp5.000", "Harga 2 buku dan 2 pensil Rp10.000"],
  }), text);
  assert.ok(v.special);
});

test("MV-07 number words", () => {
  assert.ok(extractNumbers("seharga 19 ribu").has("19000"));
  assert.ok(extractNumbers("dua puluh ekor").has("20"));
  assert.ok(extractNumbers("selusin").has("12"));
});

test("MV-08 knowledge whitelist", () => {
  const v = verify(makeModel(["x + y = 30", "2*x + 4*y = 80"], {
    sources: ["ayam dan kambing sebanyak 30 ekor", "Jumlah kakinya 80"], variables: ternak, target: "y",
  }), KAKI);
  assert.ok(v.ok);
  assert.equal(v.target_value, "10");
});

test("MV-10 PII masked", () => {
  assert.ok(maskPii("hubungi 081234567890 ya").includes("[nomor HP]"));
  assert.ok(maskPii("email ani@sekolah.sch.id").includes("[email]"));
});
