// Shared contract of the modeler's LLM call (Gemini).
import type { WordProblemModel } from "./schema.ts";

export class ModelerUnavailable extends Error {}
export class ModelerBusy extends Error {}

export interface LlmResult {
  model: WordProblemModel | null;
  /** Gemini blocked the request or did not complete it. */
  refused: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  modelId: string;
}

export type CallModel = (userContent: string) => Promise<LlmResult>;
