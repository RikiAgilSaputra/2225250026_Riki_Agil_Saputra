// /modules, /learning-path, /progress/{module}, /method-cards. Port of routers/content.py.
import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "../lib/db.ts";
import { db } from "../lib/db.ts";
import { ApiError } from "../lib/errors.ts";
import { body, user } from "../lib/http.ts";
import { getModule, getProblem, loadContent, type Module } from "../services/content.ts";
import { addTime, pyRound } from "../services/progress.ts";
import { METHOD_LABELS } from "../services/step_builder.ts";

export const contentRoutes = new Hono();

export interface ProgressRow {
  student_id: string;
  module_id: string;
  status: string;
  last_screen: number;
  best_score: number | null;
  updated_at: Date;
}

export interface ModuleStatus {
  status: string;
  last_screen: number;
  best_score: number | null;
  progress: number;
  solved: number;
}

/** Status of every module from a student's progress rows and solved problem ids. */
export function moduleStatusFrom(rows: ProgressRow[], done: Set<string>): Record<string, ModuleStatus> {
  const out: Record<string, ModuleStatus> = {};
  for (const [mid, m] of loadContent().modules) {
    const r = rows.find((x) => x.module_id === mid);
    const total = m.screens.length + m.problem_ids.length;
    const seen = Math.min(r ? r.last_screen + 1 : 0, m.screens.length);
    const solved = m.problem_ids.filter((p) => done.has(p)).length;
    out[mid] = {
      status: r ? r.status : "not_started",
      last_screen: r ? r.last_screen : 0,
      best_score: r ? r.best_score : null,
      progress: total ? pyRound((100 * (seen + solved)) / total) : 0,
      solved,
    };
  }
  return out;
}

export async function moduleStatus(sql: Db, studentId: string): Promise<Record<string, ModuleStatus>> {
  const rows = await sql<ProgressRow[]>`select * from module_progress where student_id = ${studentId}`;
  const done = await sql`select distinct problem_id from attempts where student_id = ${studentId} and completed_at is not null`;
  return moduleStatusFrom(rows, new Set(done.map((d) => d.problem_id as string)));
}

export function moduleSummary(m: Module, st: ModuleStatus) {
  return {
    id: m.id, kind: m.kind, title: m.title, subtitle: (m.subtitle as string | undefined) ?? "",
    icon: m.icon ?? null, method: m.method ?? null, level: m.level ?? null,
    screens: m.screens.length, problems: m.problem_ids.length, ...st,
  };
}

contentRoutes.get("/modules", async (c) => {
  const u = await user(c);
  const status = await moduleStatus(db(), u.id);
  return c.json({ items: [...loadContent().modules.values()].map((m) => moduleSummary(m, status[m.id])) });
});

contentRoutes.get("/learning-path", async (c) => {
  // Belajar & Literasi: every module in one staged path, with per-stage progress and the next module.
  const u = await user(c);
  const content = loadContent();
  const status = await moduleStatus(db(), u.id);
  let nextId: string | null = null;
  const stages = content.path.stages.map((stage) => {
    const mods = stage.modules.map((item) => {
      const m = content.modules.get(item.id) as Module;
      if (nextId === null && status[m.id].status !== "completed") nextId = m.id;
      return { ...moduleSummary(m, status[m.id]), role: item.role ?? "inti" };
    });
    return {
      id: stage.id, title: stage.title, description: stage.description ?? "", show_cycle: stage.show_cycle ?? false,
      modules: mods, completed: mods.filter((x) => x.status === "completed").length,
      progress: mods.length ? pyRound(mods.reduce((t, x) => t + x.progress, 0) / mods.length) : 0,
    };
  });
  return c.json({
    title: content.path.title, description: content.path.description ?? "", stages, next_module_id: nextId,
  });
});

contentRoutes.get("/modules/:id", async (c) => {
  const u = await user(c);
  const m = getModule(c.req.param("id"));
  if (!m) throw new ApiError(404, "NOT_FOUND", "Modul tidak ditemukan.");
  const sql = db();
  const st = (await moduleStatus(sql, u.id))[m.id];
  const rows = await sql`
    select problem_id, score from attempts where student_id = ${u.id} and completed_at is not null
    order by completed_at`;
  const done = new Map(rows.map((r) => [r.problem_id as string, r.score as number | null]));
  const problems = m.problem_ids.map((pid) => {
    const p = getProblem(pid)!;
    return {
      id: pid, title: p.title, mode: p.mode, method: p.method ?? null, has_story: Boolean(p.story),
      literacy: p.literacy ?? null, best_score: done.get(pid) ?? null,
    };
  });
  return c.json({
    ...moduleSummary(m, st),
    objective: m.objective ?? null,
    source: m.source ?? null,
    recall: m.recall ?? [],
    screens: m.screens,
    method_card: m.method_card ? { ...m.method_card, name: METHOD_LABELS[m.method ?? ""] ?? "" } : null,
    problem_list: problems,
    template: m.template ?? null,
  });
});

const ProgressIn = z.object({ last_screen: z.number().int().min(0), seconds: z.number().int().min(0).max(600).default(0) });

contentRoutes.put("/progress/:id", async (c) => {
  const u = await user(c);
  const moduleId = c.req.param("id");
  if (!getModule(moduleId)) throw new ApiError(404, "NOT_FOUND", "Modul tidak ditemukan.");
  const b = await body(c, ProgressIn);
  await db().begin(async (tx) => {
    // updated_at changes only when the row is new or the student got further (as with SQLAlchemy onupdate)
    await tx`
      insert into module_progress (student_id, module_id, status, last_screen)
      values (${u.id}, ${moduleId}, 'in_progress', ${b.last_screen})
      on conflict (student_id, module_id) do update set last_screen = excluded.last_screen, updated_at = now()
      where module_progress.last_screen < excluded.last_screen`;
    await addTime(tx, u.id, b.seconds);
  });
  return c.json({ ok: true });
});

contentRoutes.get("/method-cards", async (c) => {
  await user(c);
  const items = [...loadContent().modules.values()]
    .filter((m) => m.method_card)
    .map((m) => ({ method: m.method, name: METHOD_LABELS[m.method as string], module_id: m.id, ...m.method_card }));
  return c.json({ items });
});
