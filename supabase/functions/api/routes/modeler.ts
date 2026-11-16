// /modeler/*: AI word-problem modeler. Port of routers/modeler.py.
import { Hono } from "hono";
import { z } from "zod";
import { classFor, classSettings } from "../lib/auth.ts";
import { db } from "../lib/db.ts";
import { ApiError } from "../lib/errors.ts";
import { body, user } from "../lib/http.ts";
import { MAX_CHARS } from "../modeler/guard.ts";
import { IMAGE_TYPES, MAX_IMAGE_BASE64 } from "../modeler/ocr.ts";
import { analyze, MESSAGES, publicModel, scan, usedToday } from "../modeler/service.ts";

export const modelerRoutes = new Hono();

modelerRoutes.get("/modeler/quota", async (c) => {
  const u = await user(c);
  const sql = db();
  const settings = classSettings(await classFor(sql, u));
  const used = await usedToday(sql, u.id);
  return c.json({
    enabled: settings.ai_enabled || u.role !== "student", daily_quota: settings.daily_quota,
    remaining: Math.max(0, settings.daily_quota - used), max_chars: MAX_CHARS,
    allow_full_solution: settings.allow_full_solution,
  });
});

const AnalyzeIn = z.object({ text: z.string().max(MAX_CHARS * 2) });

modelerRoutes.post("/modeler/analyze", async (c) => {
  const u = await user(c);
  const b = await body(c, AnalyzeIn);
  const sql = db();
  const cls = await classFor(sql, u);
  const sub = await analyze(sql, u, cls, b.text);
  const settings = classSettings(cls);
  const out: Record<string, unknown> = {
    submission_id: sub.id, status: sub.status, cached: sub.cached,
    quota_remaining: Math.max(0, settings.daily_quota - (await usedToday(sql, u.id))),
  };
  if ((sub.status === "verified" || sub.status === "verified_special") && sub.model_json) {
    out.model = publicModel(sub.model_json);
    out.allowed_modes = ["guided", "model_only", ...(settings.allow_full_solution ? ["worked"] : [])];
    if (sub.status === "verified_special") {
      out.message = "Kedua garis sejajar atau berimpit, jadi tidak ada penyelesaian tunggal.";
    }
  } else {
    out.message = MESSAGES[sub.status] ?? MESSAGES.rejected;
    if (sub.status === "not_spldv" && sub.model_json) out.reason = sub.model_json.not_spldv_reason;
  }
  return c.json(out);
});

// Scanner: a typed/pasted text, or a photo (base64 without the "data:" prefix) read by Gemini.
const ScanIn = z.object({
  text: z.string().max(MAX_CHARS * 2).optional(),
  image: z.object({
    data: z.string().min(100).max(MAX_IMAGE_BASE64).regex(/^[A-Za-z0-9+/=\s]+$/),
    mime_type: z.enum(IMAGE_TYPES),
  }).optional(),
}).refine((b) => Boolean(b.image) || Boolean(b.text?.trim()), { path: ["text"] });

modelerRoutes.post("/modeler/scan", async (c) => {
  const u = await user(c);
  const b = await body(c, ScanIn);
  const sql = db();
  const cls = await classFor(sql, u);
  const out = await scan(sql, u, cls, { text: b.text, image: b.image && { ...b.image, data: b.image.data.replace(/\s+/g, "") } });
  const settings = classSettings(cls);
  return c.json({
    source: out.source, text: out.text, kind: out.result.kind, message: out.result.message,
    equations: out.result.equations ?? null, system: out.result.system ?? null, solvable: out.result.solvable,
    quota_remaining: Math.max(0, settings.daily_quota - (await usedToday(sql, u.id))),
  });
});

const RatingIn = z.object({ rating: z.number().int().min(-1).max(1) });

modelerRoutes.post("/modeler/:id/rating", async (c) => {
  const u = await user(c);
  const b = await body(c, RatingIn);
  const rows = await db()`
    update modeler_submissions set rating = ${b.rating}
    where id = ${c.req.param("id")} and user_id = ${u.id} returning id`;
  if (!rows.length) throw new ApiError(404, "NOT_FOUND", "Model tidak ditemukan.");
  return c.json({ ok: true });
});
