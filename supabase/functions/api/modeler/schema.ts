// Structured output contract for the modeler (docs/14 §5). Port of schema.py (Pydantic -> Zod).
import { z } from "zod";

export const Variable = z.object({
  symbol: z.enum(["x", "y"]),
  meaning: z.string().describe("Makna singkat, mis. 'harga 1 buku'"),
  unit: z.string().describe("Satuan, mis. 'rupiah', 'tahun', 'ekor'"),
  must_be_positive: z.boolean(),
  must_be_integer: z.boolean().describe("True untuk banyak benda/orang/hewan"),
}).strict();

export const Equation = z.object({
  source_text: z.string().describe("Kutipan PERSIS dari soal yang menjadi dasar persamaan ini"),
  math_sentence: z.string().describe("Kalimat matematika, mis. '2 × harga buku + 3 × harga pensil = 19.000'"),
  equation: z.string().describe("Notasi dengan x dan y dan * eksplisit, mis. '2*x + 3*y = 19000'"),
}).strict();

export const WordProblemModelSchema = z.object({
  is_spldv: z.boolean(),
  not_spldv_reason: z.string().nullable(),
  language_ok: z.boolean().describe("False jika teks bukan soal matematika berbahasa Indonesia yang wajar"),
  context_category: z.enum(["personal", "sosial_budaya", "pekerjaan", "saintifik", "geometri", "lainnya"]),
  known_facts: z.array(z.string()),
  irrelevant_facts: z.array(z.string()),
  question_text: z.string(),
  variables: z.array(Variable),
  equations: z.array(Equation),
  target: z.string().describe("Ekspresi yang ditanya dalam x dan y, mis. 'x', 'x + y', '4*x + 2*y'"),
  target_label: z.string().describe("Yang ditanya dalam kata-kata, mis. 'harga 1 buku'"),
  target_unit: z.string(),
}).strict();

export type WordProblemModel = z.infer<typeof WordProblemModelSchema>;
