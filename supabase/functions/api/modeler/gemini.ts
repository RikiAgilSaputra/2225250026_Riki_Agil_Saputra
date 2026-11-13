// Gemini (Google AI Studio key) for the modeler, via the Interactions API of @google/genai.
// Same contract as the Claude call: the model only translates the story into WordProblemModel JSON;
// everything it returns is validated with Zod and then checked by the deterministic verifier.
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { settings } from "../lib/env.ts";
import { ModelerBusy, ModelerUnavailable, type CallModel, type LlmResult } from "./llm_types.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";
import { WordProblemModelSchema } from "./schema.ts";

type JsonSchema = Record<string, unknown>;

/** Zod → JSON Schema in the subset Gemini accepts (nullable as a type array, no $schema). */
export function geminiSchema(): JsonSchema {
  const raw = z.toJSONSchema(WordProblemModelSchema) as JsonSchema;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const o = { ...(node as JsonSchema) };
    delete o.$schema;
    const anyOf = o.anyOf as JsonSchema[] | undefined;
    if (anyOf?.length === 2 && anyOf.some((s) => s.type === "null")) {
      const other = anyOf.find((s) => s.type !== "null") as JsonSchema;
      delete o.anyOf;
      return walk({ ...o, ...other, type: [other.type, "null"] });
    }
    for (const [k, v] of Object.entries(o)) o[k] = walk(v);
    return o;
  };
  return walk(raw) as JsonSchema;
}

const EFFORT_TO_THINKING: Record<string, "minimal" | "low" | "medium" | "high"> = {
  low: "low", medium: "medium", high: "high", xhigh: "high", max: "high",
};

/** Maps a finished interaction to the modeler result (exported for tests). */
export function fromInteraction(
  interaction: { status?: string; output_text?: string; model?: string; usage?: Record<string, number | undefined> },
  latencyMs: number,
  fallbackModel: string,
): LlmResult {
  const usage = interaction.usage ?? {};
  const base = {
    inputTokens: usage.total_input_tokens ?? 0,
    outputTokens: (usage.total_output_tokens ?? 0) + (usage.total_thought_tokens ?? 0),
    latencyMs,
    modelId: interaction.model ?? fallbackModel,
  };
  // Not completed (blocked by safety filters, failed, cut off) or no text: treated like a refusal.
  if (interaction.status !== "completed" || !interaction.output_text) return { ...base, model: null, refused: true };
  let json: unknown;
  try {
    json = JSON.parse(interaction.output_text);
  } catch {
    return { ...base, model: null, refused: false };
  }
  const parsed = WordProblemModelSchema.safeParse(json);
  return { ...base, model: parsed.success ? parsed.data : null, refused: false };
}

let client: GoogleGenAI | null = null;

/** Model order: the main model, then the fallback when the main one is overloaded (503/429) or slow. */
export function modelOrder(main: string, fallback: string | undefined): string[] {
  return fallback && fallback !== main ? [main, fallback] : [main];
}

export const callGemini: CallModel = async (userContent) => {
  const s = settings();
  if (!s.geminiApiKey) throw new ModelerUnavailable("GEMINI_API_KEY is not set");
  // No SDK-level retries: the whole call must fit in MODELER_TIMEOUT_SECONDS (Netlify proxy limit is 26 s).
  client ??= new GoogleGenAI({ apiKey: s.geminiApiKey, httpOptions: { retryOptions: { attempts: 1 } } });
  const started = performance.now();
  const deadline = started + s.modelerTimeoutSeconds * 1000;
  for (const model of modelOrder(s.modelerModel, s.modelerFallbackModel)) {
    const remaining = Math.floor(deadline - performance.now());
    if (remaining < 2000) break;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), remaining);
    try {
      const request = client.interactions.create({
        model,
        system_instruction: SYSTEM_PROMPT,
        input: userContent,
        response_format: { type: "text", mime_type: "application/json", schema: geminiSchema() },
        generation_config: { thinking_level: EFFORT_TO_THINKING[s.modelerEffort] ?? "medium" },
        store: false, // do not keep students' story text on Google's side after the request
      }, { timeout_ms: remaining, retries: { strategy: "none" }, fetch_options: { signal: abort.signal } });
      // Hard deadline even if the SDK keeps waiting (an overloaded model can take a minute to answer 503).
      const timeout = new Promise<never>((_, reject) =>
        abort.signal.addEventListener("abort", () => reject(new Error(`timeout after ${remaining} ms`))));
      const interaction = await Promise.race([request, timeout]);
      return fromInteraction(
        interaction as unknown as Parameters<typeof fromInteraction>[0],
        Math.round(performance.now() - started),
        model,
      );
    } catch (e) {
      const status = Number((e as { status?: number; statusCode?: number }).status ??
        (e as { statusCode?: number }).statusCode ?? 0);
      // Provider error text only (no student data): Supabase → Edge Functions → api → Logs.
      // The SDK keeps Google's JSON error ({error: {message, status, details}}) as a string in `body`.
      const detail = e as { body?: unknown; message?: string };
      const info = typeof detail.body === "string" && detail.body ? detail.body.replace(/\s+/g, " ") : String(detail.message);
      console.error(`gemini error model=${model} status=${status} name=${(e as Error).name}: ${info.slice(0, 800)}`);
      if (status >= 400 && status < 500 && status !== 429 && status !== 408) {
        throw new ModelerUnavailable((e as Error).message); // bad key or bad request: another model won't help
      }
      // overloaded, rate limited, network error or timeout → try the fallback model
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ModelerBusy(); // every model was busy, or the time budget ran out
};
