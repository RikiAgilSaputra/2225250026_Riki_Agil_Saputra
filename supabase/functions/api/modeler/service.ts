// Modeler pipeline: guard → cache → Claude → verify (→ repair once) → store (docs/14 §4). Port of service.py.
import { type ClassRow, classSettings, type User } from "../lib/auth.ts";
import type { Db } from "../lib/db.ts";
import { settings } from "../lib/env.ts";
import { ApiError } from "../lib/errors.ts";
import { buildProblem } from "../services/step_builder.ts";
import type { Problem } from "../services/types.ts";
import * as guard from "./guard.ts";
import { type CallModel, callModel as realCallModel, type LlmResult, ModelerBusy, ModelerUnavailable } from "./llm.ts";
import { PROMPT_VERSION, repairMessage, userMessage } from "./prompt.ts";
import type { WordProblemModel } from "./schema.ts";
import { type Verification, verify } from "./verifier.ts";


export const MESSAGES: Record<string, string> = {
  not_spldv: "Soal ini bukan SPLDV, jadi belum bisa dimodelkan di sini.",
  unverified: "Aku belum yakin dengan modelnya. Coba Latih Pemodelan atau tanyakan gurumu.",
  rejected: "Teks ini belum bisa diproses. Pastikan isinya soal cerita matematika.",
};

/** Tests replace the Claude call with a mock (CLAUDE.md: never call the real API in CI). */
let callModel: CallModel = realCallModel;
export function setCallModel(fn: CallModel | null): void {
  callModel = fn ?? realCallModel;
}

export interface Submission {
  id: string;
  user_id: string;
  class_id: string | null;
  input_text: string;
  input_hash: string;
  status: string;
  model_json: WordProblemModel | null;
  verification_json: Verification | null;
  repaired: boolean;
  cached: boolean;
  llm_model: string | null;
  prompt_version: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  rating: number;
}

export async function usedToday(sql: Db, userId: string): Promise<number> {
  const [r] = await sql`
    select count(*)::int as n from modeler_submissions
    where user_id = ${userId} and created_at >= now() - interval '24 hours' and cached = false`;
  return r.n;
}

async function monthCost(sql: Db): Promise<number> {
  const [r] = await sql`
    select coalesce(sum(input_tokens), 0)::float8 as tin, coalesce(sum(output_tokens), 0)::float8 as tout
    from modeler_submissions where created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'`;
  // Prices of the selected provider/model come from settings (docs/14 §10)
  return r.tin * settings().modelerPriceIn + r.tout * settings().modelerPriceOut;
}

const PUBLIC_KEYS = [
  "variables", "equations", "question_text", "target", "target_label", "target_unit",
  "context_category", "known_facts", "irrelevant_facts",
] as const;

export function publicModel(model: WordProblemModel): Record<string, unknown> {
  return Object.fromEntries(PUBLIC_KEYS.filter((k) => k in model).map((k) => [k, model[k]]));
}

function evaluate(model: WordProblemModel, text: string): [string, Verification | null] {
  if (!model.language_ok) return ["rejected", null];
  if (!model.is_spldv) return ["not_spldv", null];
  const ver = verify(model, text);
  if (!ver.ok) return ["unverified", ver];
  return [ver.special ? "verified_special" : "verified", ver];
}

async function insertSubmission(sql: Db, s: Omit<Submission, "id" | "rating">): Promise<Submission> {
  const [row] = await sql<Submission[]>`
    insert into modeler_submissions (user_id, class_id, input_text, input_hash, status, model_json,
      verification_json, repaired, cached, llm_model, prompt_version, input_tokens, output_tokens, latency_ms)
    values (${s.user_id}, ${s.class_id}, ${s.input_text}, ${s.input_hash}, ${s.status},
      ${s.model_json === null ? null : sql.json(s.model_json as never)},
      ${s.verification_json === null ? null : sql.json(s.verification_json as never)},
      ${s.repaired}, ${s.cached}, ${s.llm_model}, ${s.prompt_version}, ${s.input_tokens}, ${s.output_tokens},
      ${s.latency_ms})
    returning *`;
  return row;
}

export async function analyze(sql: Db, user: User, cls: ClassRow | null, rawText: string): Promise<Submission> {
  const cs = classSettings(cls);
  if (user.role === "student" && !cs.ai_enabled) {
    throw new ApiError(403, "AI_DISABLED_FOR_CLASS", "Pemodel AI belum diaktifkan gurumu.");
  }
  let text = guard.normalizeText(rawText);
  if (text.length > guard.MAX_CHARS) {
    throw new ApiError(413, "INPUT_TOO_LONG", `Soal terlalu panjang (maks. ${guard.MAX_CHARS} karakter).`);
  }
  if (text.length < 20) throw new ApiError(400, "VALIDATION_ERROR", "Tulis soal ceritanya lengkap dulu.");
  text = guard.maskPii(text); // never send student identity to the Claude API
  const h = await guard.textHash(text);
  const sub: Omit<Submission, "id" | "rating"> = {
    user_id: user.id, class_id: cls?.id ?? null, input_text: text, input_hash: h, status: "rejected",
    model_json: null, verification_json: null, repaired: false, cached: false, llm_model: null,
    prompt_version: PROMPT_VERSION, input_tokens: 0, output_tokens: 0, latency_ms: 0,
  };

  if (guard.hasBlockedWords(text)) return insertSubmission(sql, sub);

  const [cached] = await sql<Submission[]>`
    select * from modeler_submissions
    where input_hash = ${h} and status in ('verified', 'verified_special')
    order by created_at desc limit 1`;
  if (cached) {
    return insertSubmission(sql, {
      ...sub, status: cached.status, model_json: cached.model_json, verification_json: cached.verification_json,
      cached: true, llm_model: cached.llm_model,
    });
  }

  if (user.role === "student" && (await usedToday(sql, user.id)) >= cs.daily_quota) {
    throw new ApiError(429, "QUOTA_EXCEEDED", "Kuota pemodel hari ini sudah habis. Coba lagi besok.");
  }
  if ((await monthCost(sql)) >= settings().modelerMonthlyBudgetUsd) {
    throw new ApiError(503, "MODELER_BUDGET_PAUSED", "Pemodel AI dijeda sementara karena batas anggaran bulan ini.");
  }

  const run = async (content: string): Promise<LlmResult> => {
    try {
      return await callModel(content);
    } catch (e) {
      if (e instanceof ModelerUnavailable) {
        throw new ApiError(503, "MODELER_UNAVAILABLE", "Pemodel AI belum aktif di server ini (kunci API belum diisi atau tidak valid).");
      }
      if (e instanceof ModelerBusy) throw new ApiError(429, "MODELER_BUSY", "Pemodel sedang sibuk, coba lagi sebentar.");
      throw e;
    }
  };

  const result = await run(userMessage(text));
  sub.llm_model = result.modelId;
  sub.input_tokens = result.inputTokens;
  sub.output_tokens = result.outputTokens;
  sub.latency_ms = result.latencyMs;
  if (result.refused || result.model === null) {
    sub.status = "rejected";
  } else {
    let model = result.model;
    let [status, ver] = evaluate(model, text);
    if (status === "unverified" && model.is_spldv) {
      // At most one repair round (CLAUDE.md, AI rule 2)
      const second = await run(repairMessage(text, ver?.problems ?? []));
      sub.repaired = true;
      sub.input_tokens += second.inputTokens;
      sub.output_tokens += second.outputTokens;
      sub.latency_ms += second.latencyMs;
      if (second.model !== null && !second.refused) {
        model = second.model;
        [status, ver] = evaluate(model, text);
      }
    }
    sub.status = status;
    sub.model_json = model;
    sub.verification_json = ver;
  }
  return insertSubmission(sql, sub);
}

export function problemFromSubmission(sub: Submission, method: string, mode: string): Problem {
  const m = sub.model_json as WordProblemModel;
  const ver = sub.verification_json as Verification;
  const variables = Object.fromEntries(m.variables.map((v) => [v.symbol, { meaning: v.meaning, unit: v.unit }]));
  return buildProblem({
    pid: `ai-${sub.id}`, system: ver.system ?? [], method, mode: mode === "worked" ? "worked" : "independent",
    title: "Soal dari Pemodel", source: "ai",
    story: {
      segments: [{ id: "a", text: sub.input_text, tag: "" }],
      variables,
      equation_sources: m.equations.map((e) => e.source_text),
      target: m.target,
      target_label: m.target_label,
      target_unit: m.target_unit,
    },
    literacy: {
      level: "L1", context_category: m.context_category ?? "lainnya", representation: "text",
      akm_cognitive: "penerapan", item_format: "isian",
    },
  });
}
