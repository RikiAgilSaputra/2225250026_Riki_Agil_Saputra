// End-to-end API flows on a real Postgres (PGlite) with the real migrations. Port of tests/test_api.py and
// the pipeline tests of test_modeler.py. Gemini is never called: the modeler uses a mock.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { KAKI, makeModel, startTestDb, TEXT } from "./fixtures.ts";

// deno-lint-ignore no-explicit-any -- loose JSON shapes in tests
type Json = Record<string, any>;

let stopDb: () => Promise<void>;
// deno-lint-ignore no-explicit-any
let app: any;
let closeDb: () => Promise<void>;
let setCallModel: typeof import("../modeler/service.ts").setCallModel;

before(async () => {
  const testDb = await startTestDb();
  stopDb = testDb.stop;
  Object.assign(process.env, {
    DATABASE_URL: testDb.url, DB_POOL_MAX: "1", APP_ENV: "test", JWT_SECRET: "test-secret-0123456789-abcdefghij-klmn",
    GEMINI_API_KEY: "", SEED_DEMO: "true",
  });
  ({ app } = await import("../app.ts"));
  ({ closeDb } = await import("../lib/db.ts"));
  ({ setCallModel } = await import("../modeler/service.ts"));
});

after(async () => {
  await closeDb();
  await stopDb();
});

async function call(method: string, path: string, opts: { body?: unknown; token?: string } = {}) {
  const res = await app.request(`/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status as number, body: (await res.json()) as Json };
}

async function login(username = "siswa", password = "siswa123"): Promise<string> {
  const r = await call("POST", "/auth/login", { body: { username, password } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.access_token;
}

test("health", async () => {
  const r = await call("GET", "/health");
  assert.deepEqual(r.body, { ok: true, ai_configured: false });
});

test("login with wrong password", async () => {
  const r = await call("POST", "/auth/login", { body: { username: "siswa", password: "salah" } });
  assert.equal(r.status, 401);
  assert.equal(r.body.error.message, "Username atau password salah.");
});

test("validation errors list the fields", async () => {
  const r = await call("POST", "/auth/register-student", { body: { join_code: "K7Q2MX" } });
  assert.equal(r.status, 422);
  assert.equal(r.body.error.code, "VALIDATION_ERROR");
  assert.ok(r.body.error.fields.includes("username"));
});

test("dashboard", async () => {
  const d = (await call("GET", "/dashboard", { token: await login() })).body;
  assert.equal(d.name, "Nadia");
  assert.equal(d.daily_goal.target, 20);
  assert.equal(d.daily_goal.week.length, 7);
  assert.ok(d.streak >= 2);
  assert.ok(d.board && d.board.some((r: Json) => r.me));
  assert.deepEqual(new Set(d.skills.map((s: Json) => s.method)), new Set(["graph", "substitution", "elimination", "mixed"]));
});

test("learning path covers every module once", async () => {
  const token = await login();
  const lp = (await call("GET", "/learning-path", { token })).body;
  const ids: string[] = lp.stages.flatMap((s: Json) => s.modules.map((m: Json) => m.id));
  const all: string[] = (await call("GET", "/modules", { token })).body.items.map((m: Json) => m.id);
  assert.deepEqual([...ids].sort(), [...all].sort());
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(lp.stages[0].id, "prasyarat");
  assert.ok(ids.includes(lp.next_module_id));
  assert.ok(lp.stages.some((s: Json) => s.show_cycle));
});

test("module detail and progress", async () => {
  const token = await login();
  const m = (await call("GET", "/modules/SPL-4", { token })).body;
  assert.equal(m.method_card.name, "Substitusi");
  assert.equal(m.screens.length, 4);
  assert.equal((await call("PUT", "/progress/SPL-4", { token, body: { last_screen: 2, seconds: 60 } })).body.ok, true);
});

test("guided attempt with feedback, hints and points", async () => {
  const token = await login();
  const a = (await call("POST", "/attempts", { token, body: { problem_id: "SPL-4-i1" } })).body;
  const aid = a.attempt_id;
  assert.ok(a.problem.steps.every((s: Json) => !("display" in s))); // no answers leak
  const s1 = a.problem.steps[0].id;
  const wrong = (await call("POST", `/attempts/${aid}/steps`, { token, body: { step_id: s1, answer: "y = 1 + x" } })).body;
  assert.equal(wrong.correct, false);
  assert.ok(wrong.feedback);
  const h = (await call("POST", `/attempts/${aid}/steps/${s1}/hint`, { token })).body;
  assert.equal(h.level, 1);
  assert.equal(h.hints.length, 1);
  const ok = (await call("POST", `/attempts/${aid}/steps`, { token, body: { step_id: s1, answer: "y = x - 1" } })).body;
  assert.ok(ok.correct);
  assert.equal(ok.points, 10);
  let last: Json = {};
  for (const [sid, ans] of [["s2", "2x + 3(x - 1) = 12"], ["s3", "x = 3"], ["s4", "y = 2"]]) {
    last = (await call("POST", `/attempts/${aid}/steps`, { token, body: { step_id: sid, answer: ans } })).body;
    assert.ok(last.correct, `${sid} ${JSON.stringify(last)}`);
  }
  assert.equal(last.completed, true);
  assert.equal(last.score, 100);
  assert.equal(last.bonus, 20);
  const hist = (await call("GET", "/attempts", { token })).body.items;
  assert.ok(hist.some((x: Json) => x.id === aid && x.score === 100));
  const again = await call("POST", `/attempts/${aid}/steps`, { token, body: { step_id: "s4", answer: "y = 2" } });
  assert.equal(again.status, 400);
});

test("choosing a method rebuilds the steps", async () => {
  const token = await login();
  const a = (await call("POST", "/attempts", { token, body: { problem_id: "SPL-4-i1", method: "elimination" } })).body;
  assert.equal(a.problem.method, "elimination");
});

test("story problem has the modeling cycle and hides highlight keys", async () => {
  const token = await login();
  const a = (await call("POST", "/attempts", { token, body: { problem_id: "LIT-1-buku" } })).body;
  const stages = a.problem.steps.map((s: Json) => s.modeling_stage);
  assert.equal(stages[0], 1);
  for (const n of [2, 3, 5, 6]) assert.ok(stages.includes(n));
  assert.ok(a.problem.story.segments.every((seg: Json) => !("tag" in seg)));
});

test("generated problem", async () => {
  const r = await call("POST", "/attempts", { token: await login(), body: { template: "elimination" } });
  assert.equal(r.status, 201);
  assert.equal(r.body.problem.source, "generated");
});

test("reveal finishes the attempt", async () => {
  const token = await login();
  const a = (await call("POST", "/attempts", { token, body: { problem_id: "PRE-1-p1" } })).body;
  let last: Json = {};
  for (const s of a.problem.steps.filter((x: Json) => x.status !== "prefilled")) {
    last = (await call("POST", `/attempts/${a.attempt_id}/steps/${s.id}/reveal`, { token })).body;
  }
  assert.equal(last.completed, true);
  assert.equal(last.score, 0);
});

test("another student's attempt is hidden", async () => {
  const a = (await call("POST", "/attempts", { token: await login(), body: { problem_id: "PRE-1-p1" } })).body;
  const other = await login("demo1", "demo1234");
  assert.equal((await call("GET", `/attempts/${a.attempt_id}`, { token: other })).status, 404);
});

test("student cannot open teacher pages", async () => {
  assert.equal((await call("GET", "/teacher/overview", { token: await login() })).status, 403);
});

test("teacher overview and board toggle", async () => {
  const teacher = await login("guru", "guru123");
  const student = await login();
  const o = (await call("GET", "/teacher/overview", { token: teacher })).body;
  assert.equal(o.class.name, "Kelas 8A");
  assert.ok(o.students.some((s: Json) => s.name === "Nadia"));
  assert.ok(Array.isArray(o.hardest_steps));
  const cid = o.class.id;
  await call("PATCH", `/teacher/classes/${cid}/settings`, { token: teacher, body: { leaderboard_enabled: false } });
  assert.equal((await call("GET", "/dashboard", { token: student })).body.board, null);
  await call("PATCH", `/teacher/classes/${cid}/settings`, { token: teacher, body: { leaderboard_enabled: true } });
});

test("notes CRUD", async () => {
  const token = await login();
  const n = (await call("POST", "/notes", { token, body: { title: "Eliminasi", body: "$$\n2x + y = 7\n$$" } })).body;
  assert.equal((await call("PATCH", `/notes/${n.id}`, { token, body: { title: "E", body: "x" } })).body.title, "E");
  assert.equal((await call("GET", "/notes", { token })).body.items.length, 1);
  assert.equal((await call("DELETE", `/notes/${n.id}`, { token })).body.ok, true);
  assert.equal((await call("DELETE", `/notes/${n.id}`, { token })).status, 404);
});

test("first ever step for a new student", async () => {
  const r = await call("POST", "/auth/register-student", {
    body: { join_code: "K7Q2MX", display_name: "Rara", username: "rara8a", password: "rahasia" },
  });
  const token = r.body.access_token;
  const a = (await call("POST", "/attempts", { token, body: { problem_id: "PRE-1-p1" } })).body;
  const res = await call("POST", `/attempts/${a.attempt_id}/steps`, { token, body: { step_id: "s1", answer: "-4", duration_ms: 5000 } });
  assert.equal(res.status, 200);
  assert.ok(res.body.correct);
  const me = (await call("GET", "/progress/summary", { token })).body;
  assert.ok(me.points >= 10);
});

test("register with a join code", async () => {
  const r = await call("POST", "/auth/register-student", {
    body: { join_code: "k7q2mx", display_name: "Bima", username: "bima8a", password: "rahasia" },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.class.name, "Kelas 8A");
  const dup = await call("POST", "/auth/register-student", {
    body: { join_code: "K7Q2MX", display_name: "Bima", username: "bima8a", password: "rahasia" },
  });
  assert.equal(dup.body.error.code, "USERNAME_TAKEN");
  const bad = await call("POST", "/auth/register-student", {
    body: { join_code: "ZZZZZZ", display_name: "X", username: "xx_1", password: "rahasia" },
  });
  assert.equal(bad.body.error.code, "INVALID_JOIN_CODE");
});

test("preferences", async () => {
  const token = await login();
  const me = (await call("PATCH", "/me", { token, body: { dark_mode: true } })).body;
  assert.deepEqual(me.preferences, { dark_mode: true });
  assert.equal(me.class.join_code, null);
});

// ------------------------------------------------------------------ modeler pipeline (mocked Gemini)
test("analyze without an API key returns 503", async () => {
  const r = await call("POST", "/modeler/analyze", { token: await login(), body: { text: TEXT + " (tanpa kunci)" } });
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, "MODELER_UNAVAILABLE");
});

test("analyze: verified, then cached, then a guided attempt", async () => {
  const calls: string[] = [];
  setCallModel(async (content: string) => {
    calls.push(content);
    assert.ok(content.startsWith("<soal>\n")); // student input is wrapped as data
    return {
      model: makeModel(["2*x + 3*y = 19000", "x + 2*y = 11000"]), refused: false,
      inputTokens: 1000, outputTokens: 500, latencyMs: 10, modelId: "mock",
    };
  });
  try {
    const token = await login();
    const r = await call("POST", "/modeler/analyze", { token, body: { text: TEXT } });
    assert.equal(r.status, 200);
    assert.equal(r.body.status, "verified", JSON.stringify(r.body));
    assert.ok(!JSON.stringify(r.body).includes("solution")); // answers are not sent with the model
    // MV-12: same text again → cache hit, no new LLM call
    const r2 = (await call("POST", "/modeler/analyze", { token, body: { text: TEXT } })).body;
    assert.equal(r2.cached, true);
    assert.equal(calls.length, 1);
    const a = await call("POST", "/attempts", { token, body: { submission_id: r.body.submission_id, mode: "guided" } });
    assert.equal(a.status, 201, JSON.stringify(a.body));
    assert.equal(a.body.problem.steps[0].check, "define_variables");
    assert.ok(a.body.problem.steps.every((s: Json) => !("expected" in s)));
    assert.equal((await call("POST", `/modeler/${r.body.submission_id}/rating`, { token, body: { rating: 1 } })).body.ok, true);
  } finally {
    setCallModel(null);
  }
});

test("refusal is stored as rejected (stop_reason checked first)", async () => {
  setCallModel(async () => ({ model: null, refused: true, inputTokens: 10, outputTokens: 0, latencyMs: 5, modelId: "mock" }));
  try {
    const r = (await call("POST", "/modeler/analyze", { token: await login(), body: { text: KAKI } })).body;
    assert.equal(r.status, "rejected");
  } finally {
    setCallModel(null);
  }
});

test("MV-11 quota and AI switch", async () => {
  const teacher = await login("guru", "guru123");
  const student = await login();
  const cid = (await call("GET", "/teacher/overview", { token: teacher })).body.class.id;
  await call("PATCH", `/teacher/classes/${cid}/settings`, { token: teacher, body: { daily_quota: 0 } });
  const r = await call("POST", "/modeler/analyze", {
    token: student, body: { text: "Harga 3 apel dan 2 jeruk Rp16.000. Harga 1 apel dan 1 jeruk Rp6.000." },
  });
  assert.equal(r.status, 429);
  assert.equal(r.body.error.code, "QUOTA_EXCEEDED");
  await call("PATCH", `/teacher/classes/${cid}/settings`, { token: teacher, body: { daily_quota: 10, ai_enabled: false } });
  assert.equal((await call("POST", "/modeler/analyze", { token: student, body: { text: TEXT } })).status, 403);
  await call("PATCH", `/teacher/classes/${cid}/settings`, { token: teacher, body: { ai_enabled: true } });
  const q = (await call("GET", "/modeler/quota", { token: student })).body;
  assert.equal(q.enabled, true);
});
