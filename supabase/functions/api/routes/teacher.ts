// /teacher/*: class overview and settings. Port of routers/teacher.py (queries batched per class).
import { Hono } from "hono";
import { z } from "zod";
import { type ClassRow, classSettings, requireRole } from "../lib/auth.ts";
import { type Db, db } from "../lib/db.ts";
import { ApiError } from "../lib/errors.ts";
import { body, iso, user } from "../lib/http.ts";
import { loadContent } from "../services/content.ts";
import * as prog from "../services/progress.ts";
import { moduleStatusFrom, type ProgressRow } from "./content.ts";

export const teacherRoutes = new Hono();

async function ownClass(sql: Db, teacherId: string, classId?: string): Promise<ClassRow> {
  const [cls] = classId
    ? await sql<ClassRow[]>`select * from classes where teacher_id = ${teacherId} and id = ${classId}`
    : await sql<ClassRow[]>`select * from classes where teacher_id = ${teacherId} limit 1`;
  if (!cls) throw new ApiError(404, "NOT_FOUND", "Kelas tidak ditemukan.");
  return cls;
}

teacherRoutes.get("/teacher/overview", async (c) => {
  const u = await user(c);
  requireRole(u, "teacher", "admin");
  const sql = db();
  const cls = await ownClass(sql, u.id);
  const students = await sql<{ id: string; display_name: string; username: string }[]>`
    select u.id, u.display_name, u.username from users u join class_members m on m.student_id = u.id
    where m.class_id = ${cls.id}`;
  const ids = students.map((s) => s.id);
  const progressRows = ids.length ? await sql<ProgressRow[]>`select * from module_progress where student_id in ${sql(ids)}` : [];
  const doneRows = ids.length
    ? await sql`select distinct student_id, problem_id from attempts where student_id in ${sql(ids)} and completed_at is not null`
    : [];
  const rows = [];
  for (const s of students) {
    const st = moduleStatusFrom(
      progressRows.filter((r) => r.student_id === s.id),
      new Set(doneRows.filter((r) => r.student_id === s.id).map((r) => r.problem_id as string)),
    );
    const scores = Object.values(st).map((v) => v.best_score).filter((v): v is number => v !== null);
    rows.push({
      id: s.id, name: s.display_name, username: s.username,
      points_week: await prog.weeklyPoints(sql, s.id), streak: await prog.streak(sql, s.id),
      modules_completed: Object.values(st).filter((v) => v.status === "completed").length,
      avg_score: scores.length ? prog.pyRound(scores.reduce((t, x) => t + x, 0) / scores.length) : null,
      literacy: (await prog.literacyProfile(sql, [s.id])).indicators,
    });
  }
  // Hardest steps: error rate per (problem, step) across the class
  let hard: { problem_id: string; step_id: string; tries: number; error_rate: number }[] = [];
  if (ids.length) {
    const agg = await sql`
      select a.problem_id, s.step_id, count(*)::int as n,
             sum(case when s.is_correct then 0 else 1 end)::int as wrong
      from step_attempts s join attempts a on a.id = s.attempt_id
      where a.student_id in ${sql(ids)} and a.source = 'content'
      group by a.problem_id, s.step_id`;
    hard = agg.filter((r) => r.n >= 2).map((r) => ({
      problem_id: r.problem_id, step_id: r.step_id, tries: r.n, error_rate: prog.pyRound((100 * (r.wrong ?? 0)) / r.n),
    }));
    hard.sort((a, b) => b.error_rate - a.error_rate);
  }
  const subs = await sql`
    select id, input_text, status, rating, created_at from modeler_submissions where class_id = ${cls.id}
    order by created_at desc limit 20`;
  return c.json({
    class: { id: cls.id, name: cls.name, join_code: cls.join_code, settings: classSettings(cls) },
    students: rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
    literacy: await prog.literacyProfile(sql, ids),
    hardest_steps: hard.slice(0, 8),
    module_count: loadContent().modules.size,
    submissions: subs.map((x) => ({
      id: x.id, text: [...(x.input_text as string)].slice(0, 160).join(""), status: x.status, rating: x.rating,
      created_at: iso(x.created_at),
    })),
  });
});

const SettingsIn = z.object({
  ai_enabled: z.boolean().nullish(),
  daily_quota: z.number().int().min(0).max(30).nullish(),
  allow_full_solution: z.boolean().nullish(),
  leaderboard_enabled: z.boolean().nullish(),
});

teacherRoutes.patch("/teacher/classes/:id/settings", async (c) => {
  const u = await user(c);
  requireRole(u, "teacher", "admin");
  const b = await body(c, SettingsIn);
  const sql = db();
  const cls = await ownClass(sql, u.id, c.req.param("id"));
  const merged: Record<string, unknown> = { ...classSettings(cls) };
  for (const [k, v] of Object.entries(b)) if (v !== null && v !== undefined) merged[k] = v;
  await sql`update classes set settings = ${sql.json(merged as never)} where id = ${cls.id}`;
  return c.json(merged);
});
