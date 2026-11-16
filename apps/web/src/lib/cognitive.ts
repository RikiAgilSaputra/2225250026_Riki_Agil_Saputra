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
