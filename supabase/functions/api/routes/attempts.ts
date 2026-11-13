// /attempts/*: start, answer steps (checked on the server), hints, reveal. Port of routers/attempts.py.
import { Hono } from "hono";
import { z } from "zod";
import { classSettings, studentClass, type User } from "../lib/auth.ts";
import { db, type Tx } from "../lib/db.ts";
import { ApiError } from "../lib/errors.ts";
import { body, iso, user } from "../lib/http.ts";
import { problemFromSubmission, type Submission } from "../modeler/service.ts";
import { getProblem, rebuildWithMethod } from "../services/content.ts";
import { generate } from "../services/generator.ts";
import * as prog from "../services/progress.ts";
import type { AttemptRow, AttemptState, StepState } from "../services/progress.ts";
import { checkStep } from "../services/step_checker.ts";
import { METHOD_LABELS } from "../services/step_builder.ts";
import type { Problem, Step } from "../services/types.ts";

export const attemptRoutes = new Hono();

const PUBLIC_STEP_KEYS = ["id", "instruction", "check", "choices", "modeling_stage", "show_graph", "variable", "prefilled"];

/** Problem as the client may see it: no answer keys for unsolved steps. */
export function sanitize(problem: Problem, state: AttemptState) {
  const steps = problem.steps.map((s) => {
    const st = state[s.id] ?? {};
    const out: Record<string, unknown> = {};
    for (const k of PUBLIC_STEP_KEYS) if (k in s) out[k] = s[k];
    out.hints = (s.hints ?? []).slice(0, st.hint_level ?? 0);
    out.status = s.prefilled ? "prefilled" : (st.status ?? "todo");
    out.tries = st.tries ?? 0;
    if (s.prefilled || out.status === "correct" || out.status === "revealed") out.display = s.display ?? null;
    return out;
  });
  const story = problem.story
    ? {
      segments: (problem.story.segments ?? []).map((g) => ({ id: g.id, text: g.text })),
      variables: problem.story.variables ?? null,
      table: problem.story.table ?? null,
    }
    : null;
  return {
    id: problem.id, title: problem.title ?? null, mode: problem.mode ?? null,
    method: problem.method ?? null, method_label: METHOD_LABELS[problem.method ?? ""] ?? "",
    source: problem.source ?? null, module_id: problem.module_id ?? null,
    system: problem.system ?? null, system_display: problem.system_display ?? null,
    story, literacy: problem.literacy ?? null, graph: problem.graph ?? null,
    steps,
  };
}

function attemptOut(a: AttemptRow) {
  return {
    attempt_id: a.id, problem: sanitize(a.problem_snapshot, a.state),
    completed: a.completed_at !== null, score: a.score, points: a.points_awarded,
    template: a.problem_snapshot.template ?? null,
  };
}

const AttemptIn = z.object({
  problem_id: z.string().nullish(),
  template: z.enum(["graph", "substitution", "elimination", "mixed", "story"]).nullish(),
  module_id: z.string().nullish(),
  submission_id: z.string().nullish(),
  method: z.enum(["graph", "substitution", "elimination", "mixed"]).nullish(),
  mode: z.enum(["guided", "model_only", "worked"]).nullish(),
});

attemptRoutes.post("/attempts", async (c) => {
  const u = await user(c);
  const b = await body(c, AttemptIn);
  const sql = db();
  let source = "content";
  let p: Problem;
  if (b.problem_id) {
    const found = getProblem(b.problem_id);
    if (!found) throw new ApiError(404, "NOT_FOUND", "Soal tidak ditemukan.");
    p = found;
    if (b.method && p.system && p.method && b.method !== p.method && p.mode === "independent") {
      p = rebuildWithMethod(p, b.method);
    }
    p = structuredClone(p);
  } else if (b.template) {
    p = generate(b.template, 1 + Math.floor(Math.random() * 1e9), b.module_id ?? null);
    p.template = b.template;
    source = "generated";
  } else if (b.submission_id) {
    const [sub] = await sql<Submission[]>`select * from modeler_submissions where id = ${b.submission_id}`;
    if (!sub || sub.user_id !== u.id) throw new ApiError(404, "NOT_FOUND", "Model tidak ditemukan.");
    if (sub.status !== "verified") {
      throw new ApiError(400, "VALIDATION_ERROR", "Model ini tidak bisa diselesaikan langkah demi langkah.");
    }
    const mode = b.mode ?? "guided";
    const settings = u.role === "student" ? classSettings(await studentClass(sql, u.id)) : { allow_full_solution: true };
    if (mode === "worked" && !settings.allow_full_solution) {
      throw new ApiError(403, "FULL_SOLUTION_NOT_ALLOWED", "Gurumu menonaktifkan penyelesaian lengkap.");
    }
    p = problemFromSubmission(sub, b.method ?? "mixed", mode);
    if (mode === "model_only") {
      // Model is shown; the student solves without the define/translate scaffold.
      for (const s of p.steps) if (s.modeling_stage === 2 || s.modeling_stage === 3) s.prefilled = true;
    }
    source = "ai";
  } else {
    throw new ApiError(400, "VALIDATION_ERROR", "Pilih soal terlebih dahulu.");
  }
  const [a] = await sql<AttemptRow[]>`
    insert into attempts (student_id, problem_id, module_id, source, method, problem_snapshot, state)
    values (${u.id}, ${p.id}, ${p.module_id ?? null}, ${source}, ${p.method ?? null}, ${sql.json(p as never)}, '{}'::jsonb)
    returning *`;
  return c.json(attemptOut(a), 201);
});

async function ownAttempt(tx: Tx, attemptId: string, u: User): Promise<AttemptRow> {
  const [a] = await tx<AttemptRow[]>`select * from attempts where id = ${attemptId} for update`;
  if (!a || a.student_id !== u.id) throw new ApiError(404, "NOT_FOUND", "Pengerjaan tidak ditemukan.");
  return a;
}

function findStep(a: AttemptRow, stepId: string): Step {
  const s = a.problem_snapshot.steps.find((x) => x.id === stepId);
  if (!s || s.prefilled) throw new ApiError(404, "NOT_FOUND", "Langkah tidak ditemukan.");
  return s;
}

function nextStep(a: AttemptRow): string | null {
  for (const s of a.problem_snapshot.steps) {
    const status = a.state[s.id]?.status;
    if (!s.prefilled && status !== "correct" && status !== "revealed") return s.id;
  }
  return null;
}

const newState = (): Required<StepState> => ({ status: "todo", hint_level: 0, tries: 0 });

async function saveState(tx: Tx, a: AttemptRow): Promise<void> {
  await tx`update attempts set state = ${tx.json(a.state as never)}, points_awarded = ${a.points_awarded}
           where id = ${a.id}`;
}

async function maybeFinish(tx: Tx, a: AttemptRow, out: Record<string, unknown>): Promise<void> {
  if (a.completed_at === null && nextStep(a) === null) {
    const fin = await prog.finishAttempt(tx, a);
    Object.assign(out, { completed: true, score: fin.score, bonus: fin.bonus });
  }
}

/** Valid UUID text, otherwise 404 (ids are uuids; avoids a database cast error). */
function attemptIdParam(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(404, "NOT_FOUND", "Pengerjaan tidak ditemukan.");
  return id;
}

attemptRoutes.get("/attempts/:id", async (c) => {
  const u = await user(c);
  const a = await db().begin((tx) => ownAttempt(tx, attemptIdParam(c.req.param("id")), u));
  return c.json(attemptOut(a));
});

const StepIn = z.object({
  step_id: z.string(),
  answer: z.union([z.string(), z.record(z.string(), z.unknown())]),
  duration_ms: z.number().int().min(0).max(3_600_000).default(0),
});

attemptRoutes.post("/attempts/:id/steps", async (c) => {
  const u = await user(c);
  const b = await body(c, StepIn);
  const out = await db().begin(async (tx) => {
    const a = await ownAttempt(tx, attemptIdParam(c.req.param("id")), u);
    const s = findStep(a, b.step_id);
    const st = { ...newState(), ...(a.state[s.id] ?? {}) };
    if (st.status === "correct" || st.status === "revealed") {
      throw new ApiError(400, "VALIDATION_ERROR", "Langkah ini sudah selesai.");
    }
    const res = checkStep(s, b.answer);
    st.tries += 1;
    if (res.correct) st.status = "correct";
    a.state = { ...a.state, [s.id]: st };
    const raw = typeof b.answer === "string" ? b.answer : JSON.stringify(b.answer);
    await tx`
      insert into step_attempts (attempt_id, step_id, modeling_stage, answer_raw, is_correct, error_code,
        hint_level_used, duration_ms)
      values (${a.id}, ${s.id}, ${s.modeling_stage ?? null}, ${raw.slice(0, 300)}, ${res.correct},
        ${res.error_code}, ${st.hint_level}, ${b.duration_ms})`;
    await prog.addTime(tx, u.id, Math.floor(b.duration_ms / 1000));
    let points = 0;
    if (res.correct) {
      points = prog.pyRound(prog.POINTS_PER_STEP * prog.stepScore(st));
      a.points_awarded += points;
      await prog.addActivity(tx, u.id, { points });
    }
    const result: Record<string, unknown> = {
      correct: res.correct, error_code: res.error_code, feedback: res.feedback,
      display: res.correct ? (s.display ?? null) : null, tries: st.tries,
      suggest_hint: !res.correct && st.tries >= 3 && st.hint_level < 3,
      points, next_step_id: nextStep(a), completed: false,
    };
    await saveState(tx, a);
    await maybeFinish(tx, a, result);
    return result;
  });
  return c.json(out);
});

attemptRoutes.post("/attempts/:id/steps/:step/hint", async (c) => {
  const u = await user(c);
  const out = await db().begin(async (tx) => {
    const a = await ownAttempt(tx, attemptIdParam(c.req.param("id")), u);
    const s = findStep(a, c.req.param("step"));
    const st = { ...newState(), ...(a.state[s.id] ?? {}) };
    st.hint_level = Math.min(3, st.hint_level + 1);
    a.state = { ...a.state, [s.id]: st };
    await saveState(tx, a);
    return { level: st.hint_level, hints: s.hints.slice(0, st.hint_level) };
  });
  return c.json(out);
});

attemptRoutes.post("/attempts/:id/steps/:step/reveal", async (c) => {
  const u = await user(c);
  const out = await db().begin(async (tx) => {
    const a = await ownAttempt(tx, attemptIdParam(c.req.param("id")), u);
    const s = findStep(a, c.req.param("step"));
    const st = { ...newState(), ...(a.state[s.id] ?? {}), status: "revealed" };
    a.state = { ...a.state, [s.id]: st };
    const result: Record<string, unknown> = { display: s.display ?? null, next_step_id: nextStep(a), completed: false };
    await saveState(tx, a);
    await maybeFinish(tx, a, result);
    return result;
  });
  return c.json(out);
});

const ExplanationIn = z.object({ text: z.string().max(280) });

attemptRoutes.post("/attempts/:id/explanation", async (c) => {
  const u = await user(c);
  const b = await body(c, ExplanationIn);
  await db().begin(async (tx) => {
    const a = await ownAttempt(tx, attemptIdParam(c.req.param("id")), u);
    await tx`update attempts set explanation = ${b.text.trim()} where id = ${a.id}`;
  });
  return c.json({ ok: true });
});

attemptRoutes.get("/attempts", async (c) => {
  const u = await user(c);
  const rows = await db()<AttemptRow[]>`
    select id, problem_id, module_id, score, source, completed_at, problem_snapshot->>'title' as title
    from attempts where student_id = ${u.id} and completed_at is not null
    order by completed_at desc limit 30`;
  return c.json({
    items: rows.map((a) => ({
      id: a.id, problem_id: a.problem_id, title: (a as unknown as { title: string | null }).title,
      module_id: a.module_id, score: a.score, source: a.source, completed_at: iso(a.completed_at),
    })),
  });
});
