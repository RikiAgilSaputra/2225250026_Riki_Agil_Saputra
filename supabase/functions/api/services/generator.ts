// Problem generator: same pattern, different numbers (GL05, docs/05 §5). Port of generator.py.
import { buildProblem } from "./step_builder.ts";
import type { Problem, Story } from "./types.ts";

/** Small seeded PRNG (mulberry32) so a seed always gives the same problem. */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Inclusive, like random.randint */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  choice<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

const rupiah = (n: number) => n.toLocaleString("en-US").replace(/,/g, ".");

type Builder = (r: Rng, a: string, b: string) => [string[], Story];

function belanja(r: Rng, itemX: string, itemY: string): [string[], Story] {
  for (let i = 0; i < 200; i++) {
    const px = r.int(4, 20) * 500;
    const py = r.int(2, 12) * 500;
    const [a1, b1, a2, b2] = [r.int(1, 4), r.int(1, 4), r.int(1, 4), r.int(1, 4)];
    if (a1 * b2 - a2 * b1 === 0 || px === py) continue;
    const c1 = a1 * px + b1 * py;
    const c2 = a2 * px + b2 * py;
    const t1 = `${a1} ${itemX} dan ${b1} ${itemY} seharga Rp${rupiah(c1)}`;
    const t2 = `${a2} ${itemX} dan ${b2} ${itemY} seharga Rp${rupiah(c2)}`;
    const story: Story = {
      segments: [
        { id: "a", text: `Ani membeli ${t1}.`, tag: "known" },
        { id: "b", text: `Budi membeli ${t2}.`, tag: "known" },
        { id: "c", text: `Berapa harga 1 ${itemX}?`, tag: "asked" },
      ],
      variables: {
        x: { meaning: `harga 1 ${itemX}`, unit: "rupiah" },
        y: { meaning: `harga 1 ${itemY}`, unit: "rupiah" },
      },
      equation_sources: [t1, t2],
      target: "x",
    };
    return [[`${a1}*x + ${b1}*y = ${c1}`, `${a2}*x + ${b2}*y = ${c2}`], story];
  }
  throw new Error("generator failed");
}

function kaki(r: Rng, two: string, four: string): [string[], Story] {
  const nx = r.int(3, 25);
  const ny = r.int(3, 25);
  const total = nx + ny;
  const legs = 2 * nx + 4 * ny;
  const story: Story = {
    segments: [
      { id: "a", text: `Di kandang ada ${two} dan ${four}, jumlahnya ${total} ekor.`, tag: "known" },
      { id: "b", text: `Jumlah kakinya ${legs}.`, tag: "known" },
      { id: "c", text: `Berapa banyak ${four}?`, tag: "asked" },
    ],
    variables: {
      x: { meaning: `banyak ${two}`, unit: "ekor" },
      y: { meaning: `banyak ${four}`, unit: "ekor" },
    },
    variable_distractor: `x = kaki ${two}, y = kaki ${four}`,
    equation_sources: [`jumlahnya ${total} ekor`, `Jumlah kakinya ${legs} (${two} 2 kaki, ${four} 4 kaki)`],
    target: "y",
  };
  return [[`x + y = ${total}`, `2*x + 4*y = ${legs}`], story];
}

const STORY_TEMPLATES: { id: string; items: [string, string][]; build: Builder }[] = [
  {
    id: "belanja",
    items: [["buku", "pensil"], ["roti", "susu kotak"], ["bakso", "es jeruk"], ["pulpen", "penghapus"]],
    build: belanja,
  },
  { id: "kaki", items: [["ayam", "kambing"], ["bebek", "sapi"]], build: kaki },
];

function nonzero(r: Rng, lo: number, hi: number): number {
  const opts: number[] = [];
  for (let i = lo; i <= hi; i++) if (i !== 0) opts.push(i);
  return r.choice(opts);
}

function systemFor(template: string, r: Rng): string[] {
  for (let i = 0; i < 200; i++) {
    let X = nonzero(r, -6, 6);
    let Y = nonzero(r, -6, 6);
    let a1: number, b1: number, a2: number, b2: number;
    if (template === "graph") {
      [X, Y] = [r.int(0, 5), r.int(0, 5)];
      [a1, b1, a2, b2] = [r.int(1, 3), 1, -r.int(1, 3), 1];
    } else if (template === "substitution") {
      [a1, b1, a2, b2] = [r.int(1, 5), 1, r.int(1, 5), r.int(2, 4)];
    } else if (template === "elimination") {
      [a1, b1, a2, b2] = [r.int(1, 5), r.int(1, 3), r.int(1, 5), r.int(1, 4)];
    } else {
      [a1, b1, a2, b2] = [r.int(1, 4), r.int(1, 3), r.int(1, 4), r.int(1, 3)];
    }
    if (a1 * b2 - a2 * b1 === 0 || (a1 === a2 && b1 === b2)) continue;
    return [`${a1}*x + ${b1}*y = ${a1 * X + b1 * Y}`, `${a2}*x + ${b2}*y = ${a2 * X + b2 * Y}`];
  }
  throw new Error("generator failed");
}

/** template: graph | substitution | elimination | mixed | story */
export function generate(template: string, seed: number, moduleId: string | null = null): Problem {
  const r = new Rng(seed);
  if (template === "story") {
    const tpl = r.choice(STORY_TEMPLATES);
    const [itemX, itemY] = r.choice(tpl.items);
    const [system, story] = tpl.build(r, itemX, itemY);
    const method = r.choice(["substitution", "elimination", "mixed"]);
    return buildProblem({
      pid: `gen-story-${seed}`, system, method, mode: "independent", title: "Soal cerita mirip",
      module_id: moduleId, source: "generated", story,
      literacy: { level: "L1", context_category: "personal", representation: "text", akm_cognitive: "penerapan", item_format: "isian" },
    });
  }
  return buildProblem({
    pid: `gen-${template}-${seed}`, system: systemFor(template, r), method: template, mode: "independent",
    title: "Soal lain yang mirip", module_id: moduleId, source: "generated",
  });
}
