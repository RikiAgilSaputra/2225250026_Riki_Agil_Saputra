// Shared test fixtures: modeler models and a throwaway Postgres (PGlite) with the real migrations.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WordProblemModel } from "../modeler/schema.ts";

export const TEXT = "Harga 2 buku dan 3 pensil Rp19.000. Harga 1 buku dan 2 pensil Rp11.000. Berapa harga 1 buku?";
export const KAKI = "Di kandang ada ayam dan kambing sebanyak 30 ekor. Jumlah kakinya 80. Berapa banyak kambing?";

export function makeModel(
  equations: string[],
  opts: { sources?: string[]; variables?: WordProblemModel["variables"]; target?: string } = {},
): WordProblemModel {
  const variables = opts.variables ?? [
    { symbol: "x", meaning: "harga 1 buku", unit: "rupiah", must_be_positive: true, must_be_integer: false },
    { symbol: "y", meaning: "harga 1 pensil", unit: "rupiah", must_be_positive: true, must_be_integer: false },
  ];
  const sources = opts.sources ?? ["Harga 2 buku dan 3 pensil Rp19.000", "Harga 1 buku dan 2 pensil Rp11.000"];
  return {
    is_spldv: true, not_spldv_reason: null, language_ok: true, context_category: "personal",
    known_facts: sources, irrelevant_facts: [], question_text: "Berapa harga 1 buku?", variables,
    equations: sources.map((s, i) => ({ source_text: s, math_sentence: "-", equation: equations[i] })),
    target: opts.target ?? "x", target_label: "harga 1 buku", target_unit: "rupiah",
  };
}

const MIGRATIONS = fileURLToPath(new URL("../../../migrations/", import.meta.url));

/** Starts an in-process Postgres on a free port with all migrations applied. */
export async function startTestDb(): Promise<{ url: string; stop: () => Promise<void> }> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
  const pg = await PGlite.create();
  for (const f of readdirSync(MIGRATIONS).filter((n) => n.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  }
  const port = 54000 + Math.floor(Math.random() * 1000);
  const server = new PGLiteSocketServer({ db: pg, port, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  return {
    url: `postgres://postgres:postgres@127.0.0.1:${port}/postgres`,
    stop: async () => {
      await server.stop();
      await pg.close();
    },
  };
}
