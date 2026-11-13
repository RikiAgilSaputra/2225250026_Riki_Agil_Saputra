// /dashboard, /progress/summary, /notes. Port of routers/home.py.
import { Hono } from "hono";
import { z } from "zod";
import { classSettings, studentClass } from "../lib/auth.ts";
import { db } from "../lib/db.ts";
import { ApiError } from "../lib/errors.ts";
import { body, iso, user } from "../lib/http.ts";
import { loadContent, type Module, pathOrder } from "../services/content.ts";
import * as prog from "../services/progress.ts";
import { moduleStatus, moduleSummary } from "./content.ts";

export const homeRoutes = new Hono();

function greeting(): string {
  const h = prog.nowWib().getUTCHours();
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}

homeRoutes.get("/dashboard", async (c) => {
  const u = await user(c);
  const sql = db();
  const content = loadContent().modules;
  const status = await moduleStatus(sql, u.id);
  const [last] = await sql`
    select module_id from module_progress where student_id = ${u.id} order by updated_at desc limit 1`;
  const ids = pathOrder();
  let contId: string = last && content.has(last.module_id) ? last.module_id : ids[0];
  if (status[contId].status === "completed") {
    const later = ids.slice(ids.indexOf(contId) + 1).filter((i) => status[i].status !== "completed");
    contId = later[0] ?? contId;
  }
  const cm = content.get(contId) as Module;
  const cls = await studentClass(sql, u.id);
  const settings = classSettings(cls);
  const points = await prog.totalPoints(sql, u.id);
  const mods = [...content.values()];
  // The four method modules only (summary/bank modules also carry a method but live in the learning path)
  const skills = mods.filter((m) => m.method && m.kind === "spldv").map((m) => moduleSummary(m, status[m.id]));
  const prereq = mods.filter((m) => m.kind === "prerequisite").map((m) => moduleSummary(m, status[m.id]));
  const literacy = mods.filter((m) => m.kind === "literacy").map((m) => moduleSummary(m, status[m.id]));
  return c.json({
    greeting: greeting(),
    name: u.display_name,
    class_name: cls?.name ?? null,
    streak: await prog.streak(sql, u.id),
    points,
    level: Math.floor(points / prog.LEVEL_POINTS) + 1,
    level_progress: prog.pyRound((100 * (points % prog.LEVEL_POINTS)) / prog.LEVEL_POINTS),
    daily_goal: await prog.dailyGoal(sql, u.id),
    continue: moduleSummary(cm, status[contId]),
    skills,
    prerequisites: prereq,
    literacy,
    board: cls && settings.leaderboard_enabled ? await prog.classBoard(sql, cls.id, u.id) : null,
    challenge: await prog.weeklyChallenge(sql, u.id),
    ai_enabled: settings.ai_enabled || u.role !== "student",
  });
});

homeRoutes.get("/progress/summary", async (c) => {
  const u = await user(c);
  const sql = db();
  const status = await moduleStatus(sql, u.id);
  return c.json({
    modules: [...loadContent().modules.values()].map((m) => moduleSummary(m, status[m.id])),
    literacy: await prog.literacyProfile(sql, [u.id]),
    points: await prog.totalPoints(sql, u.id),
    streak: await prog.streak(sql, u.id),
    daily_goal: await prog.dailyGoal(sql, u.id),
  });
});

const NoteIn = z.object({
  module_id: z.string().nullish(),
  title: z.string().max(80).default(""),
  body: z.string().max(5000).default(""),
});

interface NoteRow {
  id: string;
  module_id: string | null;
  title: string;
  body: string;
  updated_at: Date;
}

const noteOut = (n: NoteRow) => ({ id: n.id, module_id: n.module_id, title: n.title, body: n.body, updated_at: iso(n.updated_at) });

homeRoutes.get("/notes", async (c) => {
  const u = await user(c);
  const rows = await db()<NoteRow[]>`select * from notes where student_id = ${u.id} order by updated_at desc`;
  return c.json({ items: rows.map(noteOut) });
});

homeRoutes.post("/notes", async (c) => {
  const u = await user(c);
  const b = await body(c, NoteIn);
  const [n] = await db()<NoteRow[]>`
    insert into notes (student_id, module_id, title, body) values (${u.id}, ${b.module_id ?? null}, ${b.title}, ${b.body})
    returning *`;
  return c.json(noteOut(n), 201);
});

homeRoutes.patch("/notes/:id", async (c) => {
  const u = await user(c);
  const b = await body(c, NoteIn);
  const [n] = await db()<NoteRow[]>`
    update notes set title = ${b.title}, body = ${b.body}, module_id = ${b.module_id ?? null}, updated_at = now()
    where id = ${c.req.param("id")} and student_id = ${u.id} returning *`;
  if (!n) throw new ApiError(404, "NOT_FOUND", "Catatan tidak ditemukan.");
  return c.json(noteOut(n));
});

homeRoutes.delete("/notes/:id", async (c) => {
  const u = await user(c);
  const rows = await db()`delete from notes where id = ${c.req.param("id")} and student_id = ${u.id} returning id`;
  if (!rows.length) throw new ApiError(404, "NOT_FOUND", "Catatan tidak ditemukan.");
  return c.json({ ok: true });
});
