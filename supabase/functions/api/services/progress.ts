// Points, streak, daily goal, class board and literacy profile. Port of services/progress.py.
//
// CLT-friendly gamification: personal goals and streak are visible; the board is class-only, uses
// nicknames and can be turned off by the teacher. No penalties are shown to students.
import type { Db } from "../lib/db.ts";
import type { Problem } from "./types.ts";

export const DAILY_GOAL_MINUTES = 20;
export const WEEKLY_CHALLENGE = 5;
export const POINTS_PER_STEP = 10;
export const COMPLETION_BONUS = 20;
export const LEVEL_POINTS = 200;
const HINT_FACTOR: Record<number, number> = { 0: 1.0, 1: 1.0, 2: 0.75, 3: 0.5 };
const WIB_OFFSET_MS = 7 * 3600 * 1000; // Asia/Jakarta, no DST

export interface StepState {
  status?: string;
  hint_level?: number;
  tries?: number;
}
export type AttemptState = Record<string, StepState>;

/** Python's round(): halves go to the even neighbour (round(62.5) == 62). */
export function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function nowWib(): Date {
  return new Date(Date.now() + WIB_OFFSET_MS); // read with getUTC* methods
}

export function today(): string {
  return isoDay(nowWib());
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
}

/** Monday of the week of `day` (default: today in WIB). */
export function weekStart(day: string = today()): string {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

export function stepScore(state: StepState | undefined): number {
  if (state?.status !== "correct") return 0;
  return HINT_FACTOR[state.hint_level ?? 0] ?? 0.5;
}

/** Atomically adds to today's activity row (creates it when missing). */
export async function addActivity(
  sql: Db, studentId: string, inc: { seconds?: number; points?: number; problems?: number }, day: string = today(),
): Promise<void> {
  const s = inc.seconds ?? 0;
  const p = inc.points ?? 0;
  const n = inc.problems ?? 0;
  await sql`
    insert into daily_activity (student_id, day, seconds, points, problems_completed)
    values (${studentId}, ${day}, ${s}, ${p}, ${n})
    on conflict (student_id, day) do update set
      seconds = daily_activity.seconds + excluded.seconds,
      points = daily_activity.points + excluded.points,
      problems_completed = daily_activity.problems_completed + excluded.problems_completed`;
}

export function addTime(sql: Db, studentId: string, seconds: number): Promise<void> {
  return addActivity(sql, studentId, { seconds: Math.max(0, Math.min(seconds, 300)) }); // cap idle time per event
}

export async function totalPoints(sql: Db, studentId: string): Promise<number> {
  const [r] = await sql`select coalesce(sum(points), 0)::int as n from daily_activity where student_id = ${studentId}`;
  return r.n;
}

export async function streak(sql: Db, studentId: string): Promise<number> {
  const rows = await sql`
    select day from daily_activity where student_id = ${studentId} and (seconds > 0 or points > 0)`;
  const days = new Set(rows.map((r) => r.day as string));
  let d = today();
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export async function dailyGoal(sql: Db, studentId: string) {
  const start = weekStart();
  const rows = await sql`
    select day, seconds, points from daily_activity where student_id = ${studentId} and day >= ${start}`;
  const byDay = new Map(rows.map((r) => [r.day as string, r]));
  const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const t = today();
  const week = labels.map((label, i) => {
    const day = addDays(start, i);
    const r = byDay.get(day);
    const minutes = r ? Math.floor(r.seconds / 60) : 0;
    return { day, label, done: minutes >= DAILY_GOAL_MINUTES, active: Boolean(r && (r.seconds || r.points)), is_today: day === t };
  });
  const tr = byDay.get(t);
  return { minutes: tr ? Math.floor(tr.seconds / 60) : 0, target: DAILY_GOAL_MINUTES, week };
}

export async function weeklyPoints(sql: Db, studentId: string): Promise<number> {
  const [r] = await sql`
    select coalesce(sum(points), 0)::int as n from daily_activity
    where student_id = ${studentId} and day >= ${weekStart()}`;
  return r.n;
}

export async function weeklyChallenge(sql: Db, studentId: string) {
  const [r] = await sql`
    select coalesce(sum(problems_completed), 0)::int as n from daily_activity
    where student_id = ${studentId} and day >= ${weekStart()}`;
  return {
    done: Math.min(r.n, WEEKLY_CHALLENGE), target: WEEKLY_CHALLENGE,
    label: `Selesaikan ${WEEKLY_CHALLENGE} soal minggu ini untuk membuka Tantangan Literasi L3`,
  };
}

export async function classBoard(sql: Db, classId: string, me: string) {
  const rows = await sql`
    select u.id, u.display_name as name, coalesce(sum(a.points), 0)::int as points
    from class_members m
    join users u on u.id = m.student_id
    left join daily_activity a on a.student_id = u.id and a.day >= ${weekStart()}
    where m.class_id = ${classId}
    group by u.id, u.display_name, m.joined_at
    order by points desc, m.joined_at`;
  const ranked = rows.map((r, i) => ({ name: r.name as string, points: r.points as number, me: r.id === me, rank: i + 1 }));
  const top = ranked.slice(0, 5);
  if (!top.some((r) => r.me)) top.push(...ranked.filter((r) => r.me));
  return top;
}

export interface AttemptRow {
  id: string;
  student_id: string;
  problem_id: string;
  module_id: string | null;
  source: string;
  method: string | null;
  problem_snapshot: Problem;
  state: AttemptState;
  score: number | null;
  points_awarded: number;
  explanation: string | null;
  started_at: Date;
  completed_at: Date | null;
}

/** Score the attempt, award bonus points, update module progress. Caller saves attempt.state. */
export async function finishAttempt(sql: Db, a: AttemptRow): Promise<{ score: number; bonus: number }> {
  const graded = a.problem_snapshot.steps.filter((s) => !s.prefilled);
  const score = graded.length
    ? pyRound((100 * graded.reduce((t, s) => t + stepScore(a.state[s.id]), 0)) / graded.length)
    : 100;
  const bonus = score >= 75 && graded.length ? COMPLETION_BONUS : 0;
  a.score = score;
  a.completed_at = new Date();
  a.points_awarded += bonus;
  await sql`update attempts set score = ${score}, completed_at = now(), points_awarded = ${a.points_awarded}
            where id = ${a.id}`;
  await addActivity(sql, a.student_id, { points: bonus, problems: 1 });
  if (a.module_id) {
    await sql`insert into module_progress (student_id, module_id, status, last_screen)
              values (${a.student_id}, ${a.module_id}, 'in_progress', 0) on conflict do nothing`;
    if (a.problem_snapshot.mode === "independent" || a.source !== "content") {
      await sql`
        update module_progress set
          best_score = greatest(coalesce(best_score, 0), ${score}),
          status = case when ${score >= 75} then 'completed' else status end,
          updated_at = now()
        where student_id = ${a.student_id} and module_id = ${a.module_id}`;
    }
  }
  return { score, bonus };
}

const STAGE_INDICATOR: Record<number, string> = {
  1: "merumuskan", 2: "merumuskan", 3: "merumuskan", 4: "menerapkan",
  5: "menafsirkan", 6: "menafsirkan", 7: "penalaran",
};

/** Average step score per literacy indicator (docs/13 §8) and per context. */
export async function literacyProfile(sql: Db, studentIds: string[]) {
  const sums: Record<string, number[]> = { merumuskan: [], menerapkan: [], menafsirkan: [], penalaran: [] };
  const contexts: Record<string, number[]> = {};
  if (!studentIds.length) return { indicators: {}, contexts: {} };
  const attempts = await sql<{ problem_snapshot: Problem; state: AttemptState }[]>`
    select problem_snapshot, state from attempts
    where student_id in ${sql(studentIds)} and completed_at is not null`;
  for (const a of attempts) {
    const ctx = (a.problem_snapshot.literacy as { context_category?: string } | null)?.context_category;
    const scores: number[] = [];
    for (const s of a.problem_snapshot.steps) {
      const stage = s.modeling_stage;
      if (!stage || s.prefilled) continue;
      const sc = stepScore(a.state[s.id]);
      sums[STAGE_INDICATOR[stage]].push(sc);
      scores.push(sc);
    }
    if (ctx && scores.length) (contexts[ctx] ??= []).push(...scores);
  }
  const avg = (v: number[]) => (v.length ? pyRound((100 * v.reduce((t, x) => t + x, 0)) / v.length) : null);
  return {
    indicators: Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, avg(v)])),
    contexts: Object.fromEntries(Object.entries(contexts).map(([k, v]) => [k, avg(v)])),
  };
}
