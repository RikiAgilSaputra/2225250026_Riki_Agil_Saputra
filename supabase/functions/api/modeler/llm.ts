// Claude API call for the modeler. The API key lives only on the server (Supabase secret).
// Port of llm_client.py: same model/effort settings, structured output parsed against the Zod schema.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { settings } from "../lib/env.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";
import { type WordProblemModel, WordProblemModelSchema } from "./schema.ts";

export class ModelerUnavailable extends Error {}
export class ModelerBusy extends Error {}

export interface LlmResult {
  model: WordProblemModel | null;
  refused: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  modelId: string;
}

export type CallModel = (userContent: string) => Promise<LlmResult>;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const s = settings();
  if (!s.anthropicApiKey) throw new ModelerUnavailable("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic({ apiKey: s.anthropicApiKey, timeout: s.modelerTimeoutSeconds * 1000, maxRetries: 2 });
  return client;
}

export const callModel: CallModel = async (userContent) => {
  const s = settings();
  const c = getClient();
  const started = performance.now();
  let response;
  try {
    response = await c.messages.parse({
      model: s.modelerModel,
      max_tokens: 16000,
      output_config: { effort: s.modelerEffort, format: zodOutputFormat(WordProblemModelSchema) },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new ModelerBusy();
    if (e instanceof Anthropic.APIConnectionError) throw new ModelerBusy();
    if (e instanceof Anthropic.APIError) {
      if ((e.status ?? 0) >= 500) throw new ModelerBusy();
      throw new ModelerUnavailable(e.message);
    }
    throw e;
  }
  const latencyMs = Math.round(performance.now() - started);
  const refused = response.stop_reason === "refusal"; // always checked before reading parsed_output
  const usage = response.usage;
  return {
    model: refused ? null : (response.parsed_output ?? null),
    refused,
    inputTokens: (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    outputTokens: usage.output_tokens ?? 0,
    latencyMs,
    modelId: response.model,
  };
};
