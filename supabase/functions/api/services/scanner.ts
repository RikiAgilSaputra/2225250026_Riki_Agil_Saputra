// Problem scanner: decides, without AI, what kind of problem a text is (docs/14 §12).
//   story     → a word problem: goes to the AI modeler (translation only)
//   equations → an SPLDV already written as two linear equations: solved step by step directly
//   other     → not an SPLDV (one equation, three or more equations, no math)
// The text may come from the keyboard or from a photo read by Gemini (modeler/ocr.ts).
import * as mp from "../math/mathparse.ts";
import { eqStr, parseSystem, pretty, solveSystem } from "./step_builder.ts";

export type ScanKind = "story" | "equations" | "other";

export interface ScanResult {
  kind: ScanKind;
  /** Machine form of the two equations (kind "equations"), accepted by POST /attempts {system}. */
  system?: string[];
  /** Display form of the equations, e.g. "2x + y = 7". */
  equations?: string[];
  /** Two equations with exactly one solution: can be solved step by step. */
  solvable: boolean;
  message: string;
}

export const SCAN_MESSAGES = {
  story: "Soal cerita terdeteksi. Periksa teksnya, lalu buat model matematikanya.",
  equations: "Soal SPLDV berbentuk persamaan terdeteksi. Bisa langsung dikerjakan langkah demi langkah.",
  noUniqueSolution: "Kedua persamaan sejajar atau berimpit, jadi tidak ada penyelesaian tunggal.",
  oneEquation: "Hanya ada satu persamaan. SPLDV memerlukan dua persamaan.",
  tooMany: "Ada lebih dari dua persamaan. SPLDV memakai tepat dua persamaan.",
  other: "Teks ini belum terlihat seperti soal SPLDV. Periksa lagi teksnya.",
} as const;

// Math characters allowed around "=" in an equation candidate (before normalization: −, ×, ·, :).
const MATH_RUN = /[0-9xyXY+\-−–—*/×·:().,\s]*=[0-9xyXY+\-−–—*/×·:().,\s]*/g;
const LABEL = /^\s*(\(\s*(?:\d+|[ivx]+)\s*\)|(?:\d+|[ivx]+)[.)](?=\s))\s*/i;
const NUMBER_WORDS = /\b(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|puluh|belas|ratus|ribu|juta|setengah|selusin|lusin)\b/i;

/** Linear equations in x/y found in the text, in order, without duplicates. */
export function findEquations(text: string): { system: string; display: string }[] {
  const pieces = text
    .split(/\r?\n|;|[{}|]|\s+dan\s+/i)
    .flatMap((p) => p.split(/,\s+(?=[^,]*=)/)) // "2x + y = 7, x − y = 2" (a decimal comma has no space)
    .map((p) => p.replace(LABEL, ""));
  const found: { system: string; display: string }[] = [];
  const seen = new Set<string>();
  for (const piece of pieces) {
    for (const m of piece.match(MATH_RUN) ?? []) {
      // Drop a leading label such as "(1):", "1)", "2." or "ii:" (not "2x" or "1.5x") and a trailing period.
      const candidate = m.trim()
        .replace(/^\(?\s*(?:\d+|[ivx]+)\s*(?:\)\s*:?|:|\.(?!\d))\s*/i, "")
        .replace(/[.,]+$/, "");
      if (!/[xyXY]/.test(candidate) || candidate.split("=").length !== 2) continue;
      let eq;
      try {
        const [l, r] = mp.parseEquation(candidate);
        const v = mp.equationVector(l, r);
        if (!v || (v[0].isZero() && v[1].isZero())) continue;
        eq = parseSystem([candidate])[0];
      } catch {
        continue;
      }
      const key = eqStr(...eq);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ system: key, display: pretty(...eq) });
    }
  }
  return found;
}

/** Words of three or more letters that are not part of the math (x, y, Rp are ignored). */
function wordCount(text: string): number {
  return (text.match(/\p{L}{3,}/gu) ?? []).length;
}

export function scanText(raw: string): ScanResult {
  const text = raw.replace(/[ \t]+/g, " ").trim();
  const eqs = findEquations(text);
  if (eqs.length >= 3) return { kind: "other", solvable: false, message: SCAN_MESSAGES.tooMany };
  if (eqs.length === 2) {
    const system = eqs.map((e) => e.system);
    const solvable = solveSystem(parseSystem(system)) !== null;
    return {
      kind: "equations", system, equations: eqs.map((e) => e.display), solvable,
      message: solvable ? SCAN_MESSAGES.equations : SCAN_MESSAGES.noUniqueSolution,
    };
  }
  const words = wordCount(text);
  const hasNumber = /\d/.test(text) || NUMBER_WORDS.test(text);
  if (words >= 6 && hasNumber) return { kind: "story", solvable: false, message: SCAN_MESSAGES.story };
  if (eqs.length === 1) return { kind: "other", solvable: false, message: SCAN_MESSAGES.oneEquation };
  return { kind: "other", solvable: false, message: SCAN_MESSAGES.other };
}
