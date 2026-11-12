export type Role = 'student' | 'teacher' | 'admin'

export interface User {
  id: string
  role: Role
  username: string
  display_name: string
  class: { id: string; name: string; join_code: string | null } | null
  preferences: { dark_mode?: boolean; large_text?: boolean }
}

export interface ModuleSummary {
  id: string
  kind: 'prerequisite' | 'spldv' | 'literacy'
  title: string
  subtitle: string
  icon: string
  method: Method | null
  level: string | null
  screens: number
  problems: number
  status: 'not_started' | 'in_progress' | 'completed'
  last_screen: number
  best_score: number | null
  progress: number
  solved: number
}

export type Method = 'graph' | 'substitution' | 'elimination' | 'mixed'

export interface Block {
  type: string
  text?: string
  label?: string
  rows?: string[][]
  lines?: string[]
  points?: { x: number; y: number; label?: string }[]
  equations?: string[]
  from?: number
  to?: number
  marks?: number[]
  x?: string
  y?: string
  /** definition */
  term?: string
  /** anatomy: equation split into labelled parts */
  parts?: { text: string; label?: 'variabel' | 'koefisien' | 'konstanta' }[]
  focus?: 'variabel' | 'koefisien' | 'konstanta'
  /** steps: ordered list */
  items?: string[]
  // `lines` (above) is reused by `eq` blocks: worked lines shown one under another
}

export interface Screen {
  concept: string
  instruction: string
  blocks: Block[]
}

export interface MethodCard {
  name: string
  steps: string[]
  when: string
  method?: Method
}

export interface ProblemListItem {
  id: string
  title: string
  mode: 'worked' | 'completion' | 'independent'
  method: Method | null
  has_story: boolean
  literacy: Literacy | null
  best_score: number | null
}

export interface ModuleDetail extends Omit<ModuleSummary, 'screens'> {
  objective: string
  source?: string
  recall: { label: string; module_id: string }[]
  screens: Screen[]
  method_card: MethodCard | null
  problem_list: ProblemListItem[]
  template: string | null
}

export interface Literacy {
  level: string
  context_category: string
  representation: string
  akm_cognitive: string
  item_format: string
}

export interface Choice {
  id: string
  label: string
}

export interface Step {
  id: string
  instruction: string
  check: string
  choices?: Choice[]
  modeling_stage?: number
  show_graph?: boolean
  variable?: 'x' | 'y'
  prefilled: boolean
  hints: string[]
  status: 'todo' | 'correct' | 'revealed' | 'prefilled'
  tries: number
  display?: string
}

export interface StoryVar {
  meaning: string
  unit: string
}

export interface Problem {
  id: string
  title: string
  mode: string
  method: Method | null
  method_label: string
  source: string
  module_id: string | null
  system: string[] | null
  system_display: string[] | null
  story: {
    segments: { id: string; text: string }[]
    variables: { x: StoryVar; y: StoryVar }
    table?: string[][] | null
  } | null
  literacy: Literacy | null
  graph: { lines: string[]; points: { x: number; y: number; label?: string }[] } | null
  steps: Step[]
}

export interface AttemptView {
  attempt_id: string
  problem: Problem
  completed: boolean
  score: number | null
  points: number
  template: string | null
}

export interface StepResult {
  correct: boolean
  error_code: string | null
  feedback: string
  display: string | null
  tries: number
  suggest_hint: boolean
  points: number
  next_step_id: string | null
  completed: boolean
  score?: number
  bonus?: number
}

export interface Dashboard {
  greeting: string
  name: string
  class_name: string | null
  streak: number
  points: number
  level: number
  level_progress: number
  daily_goal: {
    minutes: number
    target: number
    week: { day: string; label: string; done: boolean; active: boolean; is_today: boolean }[]
  }
  continue: ModuleSummary
  skills: ModuleSummary[]
  prerequisites: ModuleSummary[]
  literacy: ModuleSummary[]
  board: { name: string; points: number; rank: number; me: boolean }[] | null
  challenge: { done: number; target: number; label: string }
  ai_enabled: boolean
}

export interface LiteracyProfile {
  indicators: Record<string, number | null>
  contexts: Record<string, number | null>
}

export interface WordModel {
  variables: { symbol: 'x' | 'y'; meaning: string; unit: string }[]
  equations: { source_text: string; math_sentence: string; equation: string }[]
  question_text: string
  target: string
  target_label: string
  target_unit: string
  context_category: string
  known_facts: string[]
  irrelevant_facts: string[]
}

export interface AnalyzeResult {
  submission_id: string
  status: 'verified' | 'verified_special' | 'unverified' | 'not_spldv' | 'rejected'
  cached: boolean
  quota_remaining: number
  model?: WordModel
  allowed_modes?: ('guided' | 'model_only' | 'worked')[]
  message?: string
  reason?: string
}

export interface Note {
  id: string
  module_id: string | null
  title: string
  body: string
  updated_at: string
}
