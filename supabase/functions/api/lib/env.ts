// Settings from environment variables (Supabase secrets in production, .env.local for `npm run api:dev`).

// deno-lint-ignore no-explicit-any -- the function runs on Deno (Supabase) and on Node (local dev, tests)
const g = globalThis as any;
const isDeno = typeof g.Deno !== "undefined";

export function env(name: string): string | undefined {
  const v = isDeno ? g.Deno.env.get(name) : g.process?.env?.[name];
  return v === "" ? undefined : v;
}

function bool(name: string, def: boolean): boolean {
  const v = env(name);
  return v === undefined ? def : ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function num(name: string, def: number): number {
  const v = env(name);
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : def;
}

const DEV_SECRET = "dev-only-secret-change-me-please-32chars!!";

export interface Settings {
  appEnv: string;
  databaseUrl: string | undefined;
  jwtSecret: string;
  jwtAccessTtlMinutes: number;
  corsOrigins: string[];
  seedDemo: boolean;
  anthropicApiKey: string | undefined;
  modelerModel: string;
  modelerEffort: "low" | "medium" | "high" | "xhigh" | "max";
  modelerTimeoutSeconds: number;
  modelerDefaultDailyQuota: number;
  modelerMonthlyBudgetUsd: number;
}

let cached: Settings | null = null;

export function settings(): Settings {
  if (cached) return cached;
  const s: Settings = {
    // On Supabase (Deno) the default is production, so a missing secret fails loudly instead of silently.
    appEnv: env("APP_ENV") ?? (isDeno ? "production" : "development"),
    // SUPABASE_DB_URL is provided to every Edge Function by Supabase; DATABASE_URL overrides it (local dev).
    databaseUrl: env("DATABASE_URL") ?? env("SUPABASE_DB_URL"),
    jwtSecret: env("JWT_SECRET") ?? DEV_SECRET,
    jwtAccessTtlMinutes: num("JWT_ACCESS_TTL_MINUTES", 60 * 12),
    corsOrigins: (env("CORS_ORIGINS") ?? "http://localhost:5173").split(",").map((o) => o.trim()).filter(Boolean),
    seedDemo: bool("SEED_DEMO", true),
    anthropicApiKey: env("ANTHROPIC_API_KEY"),
    modelerModel: env("MODELER_MODEL") ?? "claude-opus-5-5",
    modelerEffort: (env("MODELER_EFFORT") ?? "medium") as Settings["modelerEffort"],
    modelerTimeoutSeconds: num("MODELER_TIMEOUT_SECONDS", 30),
    modelerDefaultDailyQuota: num("MODELER_DEFAULT_DAILY_QUOTA", 10),
    modelerMonthlyBudgetUsd: num("MODELER_MONTHLY_BUDGET_USD", 50),
  };
  if (s.appEnv === "production") {
    // Fail loudly instead of running with a guessable secret or without a database.
    if (s.jwtSecret.startsWith("dev-only") || s.jwtSecret.length < 32) {
      throw new Error("JWT_SECRET must be set to a random value of at least 32 characters in production");
    }
    if (!s.databaseUrl) throw new Error("No database: SUPABASE_DB_URL / DATABASE_URL is not set");
  }
  if (!s.databaseUrl) throw new Error("Set DATABASE_URL (Supabase connection string) in .env.local");
  cached = s;
  return s;
}

/** For tests only. */
export function resetSettings(): void {
  cached = null;
}
