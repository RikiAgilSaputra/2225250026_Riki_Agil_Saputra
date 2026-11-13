// LangkahKu API (Supabase Edge Function "api"). Same endpoints and JSON as the former FastAPI app.
// Requests arrive as /api/v1/... (Supabase strips /functions/v1; Netlify proxies /api/* here).
import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./lib/db.ts";
import { settings } from "./lib/env.ts";
import { ApiError } from "./lib/errors.ts";
import { attemptRoutes } from "./routes/attempts.ts";
import { authRoutes } from "./routes/auth.ts";
import { contentRoutes } from "./routes/content.ts";
import { homeRoutes } from "./routes/home.ts";
import { modelerRoutes } from "./routes/modeler.ts";
import { teacherRoutes } from "./routes/teacher.ts";
import { seed } from "./services/seed.ts";

export const app = new Hono().basePath("/api/v1");

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
});

app.use("*", (c, next) => {
  const origins = settings().corsOrigins;
  return cors({ origin: origins, credentials: true })(c, next);
});

// Demo class and accounts on the first request of a fresh database (SEED_DEMO=true).
app.use("*", async (_c, next) => {
  if (settings().seedDemo) await seed(db());
  await next();
});

app.get("/health", (c) => c.json({ ok: true, ai_configured: Boolean(settings().modelerApiKey) }));

for (const r of [authRoutes, contentRoutes, attemptRoutes, homeRoutes, modelerRoutes, teacherRoutes]) {
  app.route("/", r);
}

app.notFound((c) => c.json({ error: { code: "ERROR", message: "Not Found" } }, 404));

app.onError((err, c) => {
  if (err instanceof ApiError) return c.json(err.body(), err.status as 400);
  console.error(err);
  return c.json({ error: { code: "INTERNAL", message: "Terjadi kesalahan di server. Coba lagi." } }, 500);
});
