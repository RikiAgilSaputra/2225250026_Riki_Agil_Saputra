// Shapes of problems and steps. Problems are plain JSON: they are stored in attempts.problem_snapshot.

export interface Step {
  id: string;
  instruction: string;
  check: string;
  expected: unknown;
  display?: string;
  hints: string[];
  prefilled?: boolean;
  modeling_stage?: number | null;
  variable?: string;
  other_value?: string;
  choices?: { id: string; label: string }[];
  show_graph?: boolean;
  wrong_code?: string;
  [key: string]: unknown;
}

export interface Story {
  segments?: { id: string; text: string; tag?: string }[];
  variables: Record<string, { meaning: string; unit: string }>;
  equation_sources?: string[];
  target?: string;
  target_label?: string;
  target_unit?: string;
  variable_distractor?: string;
  table?: unknown;
  [key: string]: unknown;
}

export interface Problem {
  id: string;
  module_id?: string | null;
  title?: string;
  mode: string;
  method?: string;
  source?: string;
  system?: string[];
  system_display?: string[];
  solution?: { x: string; y: string };
  story?: Story | null;
  literacy?: Record<string, unknown> | null;
  steps: Step[];
  extra_steps?: Step[];
  graph?: unknown;
  template?: string;
  [key: string]: unknown;
}

export type Json = Record<string, unknown>;
