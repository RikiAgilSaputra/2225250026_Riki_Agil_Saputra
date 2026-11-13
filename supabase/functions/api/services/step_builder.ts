// Builds guided steps (with 3-level hints) for an SPLDV. Port of apps/api/app/services/step_builder.py.
//
// One builder serves bank problems, generated problems and AI-modeled problems, so method steps are
// always consistent (IL02). Instructions stay short (CLT rule R1); hints follow docs/04 §7.
import { Frac, gcdBig, ONE, ZERO } from "../math/frac.ts";
import * as mp from "../math/mathparse.ts";
import { fmtLinear, fmtNumber, Poly } from "../math/mathparse.ts";
import type { Problem, Step, Story } from "./types.ts";

export const METHOD_LABELS: Record<string, string> = {
  graph: "Grafik",
  substitution: "Substitusi",
  elimination: "Eliminasi",
  mixed: "Campuran",
};

type V = "x" | "y";
/** a*x + b*y = c with integer coefficients */
export type Eq = [Frac, Frac, Frac];
export type Sol = Record<V, Frac>;

// ---------------------------------------------------------------- system utils
/** ['2*x + y = 7', ...] -> [(a, b, c)] meaning a*x + b*y = c, integer coefficients. */
export function parseSystem(system: string[]): Eq[] {
  return system.map((eq) => {
    const [lhs, rhs] = mp.parseEquation(eq);
    const vec = mp.equationVector(lhs, rhs);
    if (vec === null) throw new Error(`Not linear: ${eq}`);
    let [a, b, c] = [vec[0], vec[1], vec[2].neg()];
    let den = 1n;
    for (const v of [a, b, c]) den = (den * v.d) / gcdBig(den, v.d);
    [a, b, c] = [a.mul(new Frac(den)), b.mul(new Frac(den)), c.mul(new Frac(den))];
    // Flip only when every variable coefficient is negative (keeps story forms like −2000x + y)
    if (a.le(0) && b.le(0)) [a, b, c] = [a.neg(), b.neg(), c.neg()];
    return [a, b, c] as Eq;
  });
}

export function solveSystem(eqs: Eq[]): Sol | null {
  const [[a1, b1, c1], [a2, b2, c2]] = eqs;
  const det = a1.mul(b2).sub(a2.mul(b1));
  if (det.isZero()) return null;
  return {
    x: c1.mul(b2).sub(c2.mul(b1)).div(det),
    y: a1.mul(c2).sub(a2.mul(c1)).div(det),
  };
}

export function eqStr(a: Frac, b: Frac, c: Frac): string {
  return `(${a})*x + (${b})*y = ${c}`;
}

export function pretty(a: Frac, b: Frac, c: Frac): string {
  return fmtLinear(a, b, ZERO, c);
}

const num = (v: Frac): string => v.toString();

/** Machine-readable form of a linear expression (only read back by the checker). */
function exprStr(p: Poly): string {
  return `(${p.coeff(1, 0)})*x + (${p.coeff(0, 1)})*y + (${p.coeff(0, 0)})`;
}

function step(
  id: string, instruction: string, check: string, expected: unknown, display: string, hints: string[],
  extra: Partial<Step> = {},
): Step {
  return { id, instruction, check, expected, display, hints, ...extra };
}

const VAR: Record<V, Poly> = { x: Poly.variable("x"), y: Poly.variable("y") };
const k = (v: Frac | number | bigint) => Poly.const(Frac.of(v));

// ---------------------------------------------------------------- methods
function linParts(expr: Poly, v: V): [Frac, Frac, Frac] {
  const kk = v === "x" ? expr.coeff(1, 0) : expr.coeff(0, 1);
  const c = expr.coeff(0, 0);
  return v === "x" ? [kk, ZERO, c] : [ZERO, kk, c];
}

/** Textbook order: '7 − 2x' rather than '−2x + 7'. */
export function fmtIso(expr: Poly, v: V): string {
  const [a, b, c] = linParts(expr, v);
  const kk = a.isZero() ? b : a;
  if (kk.lt(0) && c.gt(0)) {
    const mag = kk.eq(-1) ? "" : fmtNumber(kk.neg());
    return `${fmtNumber(c)} − ${mag}${v}`;
  }
  return fmtLinear(a, b, c);
}

function coefStr(c: Frac): string {
  return c.eq(1) ? "" : c.eq(-1) ? "−" : fmtNumber(c);
}

function substitutionSteps(eqs: Eq[], sol: Sol): Step[] {
  const order: [number, V][] = [[0, "y"], [1, "y"], [0, "x"], [1, "x"]];
  let [i, v] = order.find(([ii, vv]) => eqs[ii][vv === "x" ? 0 : 1].abs().eq(1)) ?? [0, "y" as V];
  const j = 1 - i;
  let o: V = v === "y" ? "x" : "y";
  const [a, b, c] = eqs[i];
  let [coefV, coefO] = v === "y" ? [b, a] : [a, b];
  if (coefV.isZero()) {
    // fallback: isolate the other variable
    [v, o] = [o, v];
    [coefV, coefO] = [coefO, coefV];
  }
  const iso = k(c).sub(k(coefO).mul(VAR[o])).div(k(coefV)); // v = iso
  const isoS = fmtIso(iso, o);
  const [aj, bj, cj] = eqs[j];
  const cvj = v === "y" ? bj : aj;
  const coj = v === "y" ? aj : bj;
  const subExpr = k(coj).mul(VAR[o]).add(k(cvj).mul(iso));
  const A = o === "x" ? subExpr.coeff(1, 0) : subExpr.coeff(0, 1);
  const C0 = subExpr.coeff(0, 0);
  const simplified = fmtLinear(o === "x" ? A : ZERO, o === "y" ? A : ZERO, ZERO, cj.sub(C0));
  const oVal = sol[o];
  const vVal = sol[v];
  const cojS = coefStr(coj);
  const cvjS = coefStr(cvj);
  const subDisplay = !coj.isZero()
    ? `${cojS}${o} + ${cvjS}(${isoS}) = ${fmtNumber(cj)}`
    : `${cvjS}(${isoS}) = ${fmtNumber(cj)}`;
  return [
    step(
      "m1", `Ubah persamaan (${i + 1}) menjadi ${v} = ...`, "equation_equivalent",
      `${v} = ${exprStr(iso)}`, `${v} = ${isoS}`,
      [
        `Tujuannya: ${v} sendirian di ruas kiri.`,
        `Pindahkan suku ${o} ke ruas kanan. Tandanya berubah.`,
        `${pretty(a, b, c)}  →  ${v} = ${isoS}`,
      ],
    ),
    step(
      "m2", `Masukkan ${v} = ${isoS} ke persamaan (${j + 1}).`, "equation_equivalent",
      `(${coj})*${o} + (${cvj})*(${exprStr(iso)}) = ${cj}`, subDisplay,
      [
        `Ganti ${v} di persamaan (${j + 1}) dengan bentuk dari langkah sebelumnya.`,
        `Persamaan (${j + 1}): ${pretty(aj, bj, cj)}. Tulis (${isoS}) di tempat ${v}.`,
        subDisplay,
      ],
    ),
    step(
      "m3", `Tentukan nilai ${o}.`, "value", num(oVal), `${o} = ${fmtNumber(oVal)}`,
      [
        `Sederhanakan, kumpulkan suku ${o} di satu ruas.`,
        `Persamaannya menjadi ${simplified}.`,
        `${o} = ${fmtNumber(oVal)}`,
      ],
      { variable: o, other_value: num(vVal) },
    ),
    step(
      "m4", `Masukkan ${o} = ${fmtNumber(oVal)} ke ${v} = ${isoS}. Tentukan ${v}.`, "value",
      num(vVal), `${v} = ${fmtNumber(vVal)}`,
      [
        `Ganti ${o} dengan ${fmtNumber(oVal)}.`,
        `${v} = ${isoS ? isoS.split(o).join(`(${fmtNumber(oVal)})`) : ""}`,
        `${v} = ${fmtNumber(vVal)}`,
      ],
      { variable: v, other_value: num(oVal) },
    ),
  ];
}

/** Steps that make coefficients of `elim` equal and combine. */
function eliminationCore(eqs: Eq[], sol: Sol, elim: V): [Step[], V] {
  const keep: V = elim === "y" ? "x" : "y";
  const idx = elim === "y" ? 1 : 0;
  const [[a1, b1, c1], [a2, b2, c2]] = eqs;
  const [e1, e2] = elim === "y" ? [b1, b2] : [a1, a2];
  const g = gcdBig(e1.n, e2.n);
  const m1 = new Frac(e2.abs().n / g);
  const m2 = new Frac(e1.abs().n / g);
  const s1: Eq = [a1.mul(m1), b1.mul(m1), c1.mul(m1)];
  const s2: Eq = [a2.mul(m2), b2.mul(m2), c2.mul(m2)];
  const steps: Step[] = [];
  ([[m1, eqs[0], s1], [m2, eqs[1], s2]] as [Frac, Eq, Eq][]).forEach(([m, orig, scaled], n0) => {
    const n = n0 + 1;
    if (!m.eq(1)) {
      steps.push(step(
        `e${n}`, `Kalikan persamaan (${n}) dengan ${fmtNumber(m)} agar koefisien ${elim} sama.`,
        "equation_scaled", eqStr(...scaled), pretty(...scaled),
        [
          `Koefisien ${elim} harus sama besar di kedua persamaan.`,
          `Kalikan semua suku persamaan (${n}) dengan ${fmtNumber(m)}, kedua ruas.`,
          `${pretty(...orig)}  ×${fmtNumber(m)}  →  ${pretty(...scaled)}`,
        ],
      ));
    }
  });
  const sameSign = s1[idx].gt(0) === s2[idx].gt(0);
  const op = sameSign ? "Kurangkan" : "Jumlahkan";
  const sg = sameSign ? -1 : 1;
  const comb: Eq = [s1[0].add(s2[0].mul(sg)), s1[1].add(s2[1].mul(sg)), s1[2].add(s2[2].mul(sg))];
  steps.push(step(
    "e3", `${op} kedua persamaan untuk menghilangkan ${elim}.`, "equation_equivalent",
    eqStr(...comb), pretty(...comb),
    [
      `Tujuannya: ${elim} hilang, tinggal ${keep}.`,
      `Tanda koefisien ${elim} ${sameSign ? "sama, jadi dikurangkan" : "berlawanan, jadi dijumlahkan"}.`,
      `${pretty(...s1)}\n${sameSign ? "−" : "+"} ${pretty(...s2)}\n= ${pretty(...comb)}`,
    ],
  ));
  const kVal = sol[keep];
  const lead = comb[0].isZero() ? comb[1] : comb[0];
  if (!lead.abs().eq(1)) {
    // otherwise the combined equation already gives the value
    steps.push(step(
      "e4", `Tentukan nilai ${keep}.`, "value", num(kVal), `${keep} = ${fmtNumber(kVal)}`,
      [
        `Bagi kedua ruas dengan koefisien ${keep}.`,
        `${pretty(...comb)}  →  ${keep} = ${fmtNumber(comb[2])} : ${fmtNumber(lead)}`,
        `${keep} = ${fmtNumber(kVal)}`,
      ],
      { variable: keep, other_value: num(sol[elim]) },
    ));
  }
  return [steps, keep];
}

function pickElim(eqs: Eq[]): V {
  return !eqs[0][1].isZero() && !eqs[1][1].isZero() ? "y" : "x";
}

function eliminationSteps(eqs: Eq[], sol: Sol): Step[] {
  const elim = pickElim(eqs);
  const [steps, keep] = eliminationCore(eqs, sol, elim);
  const otherVal = sol[elim];
  steps.push(step(
    "e5", `Ulangi eliminasi: hilangkan ${keep} untuk mencari ${elim}.`, "value",
    num(otherVal), `${elim} = ${fmtNumber(otherVal)}`,
    [
      `Sekarang samakan koefisien ${keep}.`,
      `Kalikan, lalu kurangkan atau jumlahkan seperti tadi agar ${keep} hilang.`,
      `${elim} = ${fmtNumber(otherVal)}`,
    ],
    { variable: elim, other_value: num(sol[keep]) },
  ));
  return steps;
}

function mixedSteps(eqs: Eq[], sol: Sol): Step[] {
  const elim = pickElim(eqs);
  const [steps, keep] = eliminationCore(eqs, sol, elim);
  const [a1, b1, c1] = eqs[0];
  const kv = sol[keep];
  let sub: Eq;
  let subDisplay: string;
  if (keep === "x") {
    sub = [ZERO, b1, c1.sub(a1.mul(kv))];
    subDisplay = `${coefStr(a1)}(${fmtNumber(kv)}) + ${coefStr(b1)}y = ${fmtNumber(c1)}`;
  } else {
    sub = [a1, ZERO, c1.sub(b1.mul(kv))];
    subDisplay = `${coefStr(a1)}x + ${coefStr(b1)}(${fmtNumber(kv)}) = ${fmtNumber(c1)}`;
  }
  steps.push(step(
    "c1", `Masukkan ${keep} = ${fmtNumber(kv)} ke persamaan (1).`, "equation_equivalent",
    eqStr(...sub), subDisplay,
    [
      "Ini bagian substitusi: masukkan nilai yang sudah ditemukan.",
      `Persamaan (1): ${pretty(...eqs[0])}. Ganti ${keep} dengan ${fmtNumber(kv)}.`,
      subDisplay,
    ],
  ));
  const ev = sol[elim];
  steps.push(step(
    "c2", `Tentukan nilai ${elim}.`, "value", num(ev), `${elim} = ${fmtNumber(ev)}`,
    [
      `Pindahkan konstanta, lalu bagi dengan koefisien ${elim}.`,
      `${pretty(...sub)}`,
      `${elim} = ${fmtNumber(ev)}`,
    ],
    { variable: elim, other_value: num(kv) },
  ));
  return steps;
}

function graphSteps(eqs: Eq[], sol: Sol): Step[] {
  const steps: Step[] = [];
  eqs.forEach(([a, b, c], n0) => {
    const n = n0 + 1;
    if (!b.isZero()) {
      const yi = c.div(b);
      steps.push(step(
        `g${n}`, `Garis (${n}): jika x = 0, berapa nilai y?`, "value", num(yi),
        `y = ${fmtNumber(yi)}  →  titik (0, ${fmtNumber(yi)})`,
        ["Ganti x dengan 0 pada persamaannya.", `${!b.eq(1) ? fmtNumber(b) : ""}y = ${fmtNumber(c)}`, `y = ${fmtNumber(yi)}`],
        { variable: "y", show_graph: true },
      ));
    } else {
      const xi = c.div(a);
      steps.push(step(
        `g${n}`, `Garis (${n}): berapa nilai x?`, "value", num(xi), `x = ${fmtNumber(xi)}`,
        ["Garis ini tegak.", `${fmtNumber(a)}x = ${fmtNumber(c)}`, `x = ${fmtNumber(xi)}`],
        { variable: "x", show_graph: true },
      ));
    }
  });
  steps.push(step(
    "g3", "Lihat grafik. Di titik mana kedua garis berpotongan?", "point",
    [num(sol.x), num(sol.y)], `(${fmtNumber(sol.x)}, ${fmtNumber(sol.y)})`,
    [
      "Cari titik yang dilalui kedua garis sekaligus.",
      `Titik potongnya ada di x = ${fmtNumber(sol.x)}.`,
      `(${fmtNumber(sol.x)}, ${fmtNumber(sol.y)})`,
    ],
    { show_graph: true },
  ));
  return steps;
}

const BUILDERS: Record<string, (eqs: Eq[], sol: Sol) => Step[]> = {
  substitution: substitutionSteps,
  elimination: eliminationSteps,
  mixed: mixedSteps,
  graph: graphSteps,
};

// ---------------------------------------------------------------- stories
/** Modeling-cycle steps (docs/13 §3). Returns [before_method, after_method]. */
function storySteps(story: Story, eqs: Eq[], sol: Sol, includeHighlight: boolean): [Step[], Step[]] {
  const vx = story.variables.x;
  const vy = story.variables.y;
  const before: Step[] = [];
  const segs = story.segments ?? [];
  if (includeHighlight && segs.some((s) => s.tag)) {
    const tags = Object.fromEntries(segs.map((s) => [s.id, s.tag ?? ""]));
    const known = segs.filter((s) => s.tag === "known").map((s) => s.text);
    before.push(step(
      "p1", "Tandai yang diketahui dan yang ditanyakan.", "highlight_spans", tags,
      "Diketahui: " + known.join(" / "),
      [
        "Diketahui = informasi yang berisi angka dan dipakai.",
        "Ditanya biasanya diawali kata 'berapa' atau 'tentukan'.",
        "Diketahui: " + known.join(" / "),
      ],
      { modeling_stage: 1 },
    ));
  }
  const correct = `x = ${vx.meaning} (${vx.unit}), y = ${vy.meaning} (${vy.unit})`;
  const swapped = `x = ${vy.meaning} (${vy.unit}), y = ${vx.meaning} (${vx.unit})`;
  const words = vx.meaning.split(/\s+/).filter(Boolean);
  const distract = story.variable_distractor || `x = banyak ${words.at(-1)}, y = total semuanya`;
  const choices = [{ id: "a", label: correct }, { id: "b", label: distract }, { id: "c", label: swapped }];
  before.push(step(
    "p2", "Pilih arti x dan y.", "define_variables", "a", correct,
    [
      "x dan y adalah dua hal yang belum diketahui nilainya.",
      "Cari dua hal yang nilainya dicari dalam cerita.",
      correct,
    ],
    { choices, modeling_stage: 2, wrong_code: "WRONG_CHOICE" },
  ));
  const sources = story.equation_sources?.length ? story.equation_sources : ["persamaan pertama", "persamaan kedua"];
  if (sources.length !== eqs.length) throw new Error("equation_sources must match the equations");
  eqs.forEach(([a, b, c], n0) => {
    const n = n0 + 1;
    before.push(step(
      `t${n}`, `Tulis persamaan (${n}) dari: “${sources[n0]}”`, "equation_equivalent",
      eqStr(a, b, c), pretty(a, b, c),
      [
        "Ganti setiap hal yang dicari dengan x atau y.",
        "Banyaknya × nilai satuan, lalu jumlahkan. Hasilnya di ruas kanan.",
        pretty(a, b, c),
      ],
      { modeling_stage: 3 },
    ));
  });
  const after: Step[] = [];
  const target = story.target ?? "x";
  const targetExpr = mp.parseExpression(target);
  const tval = targetExpr.evalAt(sol.x, sol.y);
  if (tval === null) throw new Error("target is not a polynomial");
  const unit = story.target_unit || (target === "y" ? vy.unit : vx.unit);
  const tdesc = story.target_label ||
    (target === "x" ? vx.meaning : target === "y" ? vy.meaning : "yang ditanyakan");
  const wrong1 = target === "x" ? sol.y : target === "y" ? sol.x : sol.x.add(sol.y);
  const wrong2 = !tval.isZero() ? tval.mul(10) : ONE;
  const options = [
    { id: "a", label: `Jadi, ${tdesc} adalah ${fmtNumber(tval)} ${unit}.` },
    { id: "b", label: `Jadi, ${tdesc} adalah ${fmtNumber(wrong1)} ${unit}.` },
    { id: "c", label: `Jadi, ${tdesc} adalah ${fmtNumber(wrong2)} ${unit}.` },
  ];
  if (target !== "x" && target !== "y") {
    const parts = mp.linearCoeffs(targetExpr);
    if (parts === null) throw new Error("target must be linear");
    after.push(step(
      "r0", `Hitung yang ditanyakan: ${fmtLinear(...parts)}.`, "value", num(tval), fmtNumber(tval),
      [
        "Pakai nilai x dan y yang sudah kamu temukan.",
        `Ganti x = ${fmtNumber(sol.x)} dan y = ${fmtNumber(sol.y)}.`,
        fmtNumber(tval),
      ],
      { modeling_stage: 5 },
    ));
  }
  after.push(step(
    "r1", "Tulis kembali jawabannya dalam cerita.", "interpret", "a", options[0].label,
    [
      "Kembali ke pertanyaan: apa yang ditanyakan?",
      `Yang ditanya: ${tdesc}. Satuannya ${unit}.`,
      options[0].label,
    ],
    // Deterministic order so the correct answer is not always first.
    { choices: [options[1], options[0], options[2]], modeling_stage: 5 },
  ));
  const [a1, b1, c1] = eqs[0];
  after.push(step(
    "r2", `Periksa ke cerita: hitung ${fmtLinear(a1, b1)} dengan nilai x dan y-mu.`, "value",
    num(c1), `${fmtNumber(c1)} — sesuai cerita ✓`,
    [
      "Jawaban yang benar harus cocok dengan cerita.",
      `Hitung ${fmtNumber(a1)} × ${fmtNumber(sol.x)} + ${fmtNumber(b1)} × ${fmtNumber(sol.y)}.`,
      fmtNumber(c1),
    ],
    { modeling_stage: 6 },
  ));
  return [before, after];
}

// ---------------------------------------------------------------- public API
export interface BuildArgs {
  pid: string;
  system: string[];
  method: string;
  mode?: string;
  title?: string;
  module_id?: string | null;
  source?: string;
  story?: Story | null;
  literacy?: Record<string, unknown> | null;
  completion_blanks?: number;
}

export function buildProblem(args: BuildArgs): Problem {
  const { pid, system, method, mode = "independent", title = "", module_id = null, source = "content" } = args;
  const story = args.story ?? null;
  const eqs = parseSystem(system);
  const sol = solveSystem(eqs);
  if (sol === null) throw new Error("System has no unique solution");
  const builder = BUILDERS[method];
  if (!builder) throw new Error(`Unknown method: ${method}`);
  const methodSteps = builder(eqs, sol);
  for (const s of methodSteps) if (!("modeling_stage" in s)) s.modeling_stage = story ? 4 : null;
  let before: Step[] = [];
  let after: Step[] = [];
  if (story) [before, after] = storySteps(story, eqs, sol, source === "content");
  const steps = [...before, ...methodSteps, ...after];
  steps.forEach((s, i) => {
    s.id = `s${i + 1}`;
    s.prefilled = mode === "worked";
  });
  if (mode === "completion") {
    for (const s of steps.slice(0, Math.max(0, steps.length - (args.completion_blanks ?? 1)))) s.prefilled = true;
  }
  return {
    id: pid,
    module_id,
    title,
    mode,
    method,
    source,
    system: eqs.map((e) => eqStr(...e)),
    system_display: eqs.map((e) => pretty(...e)),
    solution: { x: num(sol.x), y: num(sol.y) },
    story,
    literacy: args.literacy ?? null,
    steps,
  };
}
