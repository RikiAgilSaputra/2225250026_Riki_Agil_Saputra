// Cognitive functions of Rigorous Mathematical Thinking (Kinard & Kozulin), adapted for SPLDV (docs/15 §4).
// Order = teaching order; ids match the backends (COGNITIVE_FUNCTIONS).

export type CognitiveFunction =
  | 'labeling'
  | 'comparing'
  | 'systematic_search'
  | 'encoding'
  | 'conserving_constancy'
  | 'analyzing_integrating'
  | 'projecting_relationships'
  | 'analogical_thinking'
  | 'functional_relationship'
  | 'logical_evidence'

export interface CognitiveInfo {
  label: string
  /** What the student does (one sentence, ≤ 15 words). */
  meaning: string
  /** Mediating question the student can ask themselves. */
  question: string
}

export const COGNITIVE: Record<CognitiveFunction, CognitiveInfo> = {
  labeling: {
    label: 'Memberi label',
    meaning: 'Memberi nama sesuatu berdasarkan ciri pentingnya.',
    question: 'Apa nama yang tepat untuk ini, dan mengapa?',
  },
  comparing: {
    label: 'Membandingkan',
    meaning: 'Mencari persamaan dan perbedaan memakai ukuran pembanding yang jelas.',
    question: 'Ukuran apa yang kubandingkan?',
  },
  systematic_search: {
    label: 'Mencari secara sistematis',
    meaning: 'Mengumpulkan informasi secara urut, lengkap, dan teliti.',
    question: 'Apa yang diketahui, ditanya, dan tidak dipakai?',
  },
  encoding: {
    label: 'Menyandikan',
    meaning: 'Mengubah kalimat menjadi simbol, atau simbol kembali menjadi kalimat.',
    question: 'Apa arti simbol ini dalam cerita?',
  },
  conserving_constancy: {
    label: 'Menjaga yang tetap',
    meaning: 'Melihat apa yang tetap sama ketika hal lain berubah.',
    question: 'Apa yang tidak boleh berubah di langkah ini?',
  },
  analyzing_integrating: {
    label: 'Mengurai & menyatukan',
    meaning: 'Memecah keseluruhan menjadi bagian, lalu menyatukan bagian menjadi keseluruhan.',
    question: 'Bagian apa yang kugabung atau kupisahkan?',
  },
  projecting_relationships: {
    label: 'Memindahkan hubungan',
    meaning: 'Membawa hubungan yang sudah diketahui ke tempat atau persamaan lain.',
    question: 'Hubungan mana yang kubawa ke persamaan lain?',
  },
  analogical_thinking: {
    label: 'Berpikir analogi',
    meaning: 'Memakai struktur soal yang sudah dipahami untuk soal baru.',
    question: 'Soal ini mirip soal mana sebelumnya?',
  },
  functional_relationship: {
    label: 'Hubungan fungsional',
    meaning: 'Melihat bagaimana satu besaran berubah karena besaran lain berubah.',
    question: 'Jika x berubah, bagaimana y berubah?',
  },
  logical_evidence: {
    label: 'Bukti logis',
    meaning: 'Membuktikan jawaban dengan alasan yang masuk akal secara matematika.',
    question: 'Bagaimana aku tahu jawabanku benar?',
  },
}

export const COGNITIVE_ORDER = Object.keys(COGNITIVE) as CognitiveFunction[]

export function cognitiveInfo(id: string | null | undefined): CognitiveInfo | null {
  return id && id in COGNITIVE ? COGNITIVE[id as CognitiveFunction] : null
}

/** The three RMT phases (Kinard & Kozulin, ch. 5); each learning-path stage belongs to one (docs/15 §2). */
export const RMT_PHASES: Record<number, { label: string; meaning: string }> = {
  1: { label: 'Fase I · Alat berpikir', meaning: 'Membentuk cara berpikir: membandingkan, mencari teliti, membuktikan.' },
  2: { label: 'Fase II · Isi sebagai proses', meaning: 'Membangun konsep dari pengalaman dengan alat matematika.' },
  3: { label: 'Fase III · Membangun konsep', meaning: 'Memakai alat dan cara berpikir untuk menyelesaikan soal.' },
}

export type PracticeTemplate = 'graph' | 'substitution' | 'elimination' | 'mixed' | 'story'

/** Cognitive functions each generated practice mainly trains (mirrors STEP_COGNITIVE in step_builder). */
export const TEMPLATE_FUNCTIONS: Record<PracticeTemplate, CognitiveFunction[]> = {
  graph: ['functional_relationship', 'comparing'],
  substitution: ['conserving_constancy', 'projecting_relationships'],
  elimination: ['conserving_constancy', 'analyzing_integrating'],
  mixed: ['analyzing_integrating', 'analogical_thinking'],
  story: ['labeling', 'systematic_search', 'encoding'],
}

/** Below this average step score a function is still "growing" (its zone of proximal development). */
export const GROWING_BELOW = 80

/**
 * Picks the weakest practised function and a practice that trains it.
 * Unpractised functions (null) are skipped: there is no evidence yet.
 */
export function recommendPractice(
  profile: Record<string, number | null> | undefined,
): { fn: CognitiveFunction; score: number; template: PracticeTemplate } | null {
  let best: { fn: CognitiveFunction; score: number } | null = null
  for (const fn of COGNITIVE_ORDER) {
    const v = profile?.[fn]
    if (v == null || v >= GROWING_BELOW) continue
    if (!best || v < best.score) best = { fn, score: v }
  }
  if (!best) return null
  const template =
    (Object.keys(TEMPLATE_FUNCTIONS) as PracticeTemplate[]).find((t) => TEMPLATE_FUNCTIONS[t].includes(best.fn)) ?? 'mixed'
  return { ...best, template }
}

export type Growth = 'lancar' | 'berkembang' | 'perlu'

/**
 * Reflection after a problem (RMT: elaborate the activity through cognitive categories).
 * A function is "lancar" when every step was right first try, "perlu" when a step was revealed.
 */
export function reflectSteps(
  steps: { cognitive_function?: string; prefilled: boolean; status: string; tries: number }[],
): { fn: CognitiveFunction; growth: Growth }[] {
  const worst = new Map<CognitiveFunction, Growth>()
  const rank: Record<Growth, number> = { lancar: 0, berkembang: 1, perlu: 2 }
  for (const s of steps) {
    if (s.prefilled || !cognitiveInfo(s.cognitive_function)) continue
    const fn = s.cognitive_function as CognitiveFunction
    const g: Growth = s.status === 'revealed' ? 'perlu' : s.status === 'correct' && s.tries <= 1 ? 'lancar' : 'berkembang'
    const prev = worst.get(fn)
    if (!prev || rank[g] > rank[prev]) worst.set(fn, g)
  }
  return COGNITIVE_ORDER.filter((fn) => worst.has(fn)).map((fn) => ({ fn, growth: worst.get(fn)! }))
}
