// LLM call for the modeler. The API key lives only on the server (Supabase secret).
// Provider: MODELER_PROVIDER, or Gemini when GEMINI_API_KEY is set, else Claude (lib/env.ts).
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { settings } from "../lib/env.ts";
import { callGemini } from "./gemini.ts";
import { type CallModel, ModelerBusy, ModelerUnavailable } from "./llm_types.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";
import { WordProblemModelSchema } from "./schema.ts";

export { type CallModel, type LlmResult, ModelerBusy, ModelerUnavailable } from "./llm_types.ts";

let client: Anthropic | null = null;

/** Claude: structured output parsed against the Zod schema (port of llm_client.py). */
export const callClaude: CallModel = async (userContent) => {
  const s = settings();
  if (!s.anthropicApiKey) throw new ModelerUnavailable("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic({ apiKey: s.anthropicApiKey, timeout: s.modelerTimeoutSeconds * 1000, maxRetries: 2 });
  const started = performance.now();
  let response;
  try {
    response = await client.messages.parse({
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

export const callModel: CallModel = (userContent) =>
  settings().modelerProvider === "gemini" ? callGemini(userContent) : callClaude(userContent);
