// Shared contract of the modeler's LLM call (Claude or Gemini).
import type { WordProblemModel } from "./schema.ts";

export class ModelerUnavailable extends Error {}
export class ModelerBusy extends Error {}

export interface LlmResult {
  model: WordProblemModel | null;
  /** The provider declined (Claude stop_reason "refusal", Gemini blocked/not completed). */
  refused: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  modelId: string;
}

export type CallModel = (userContent: string) => Promise<LlmResult>;
