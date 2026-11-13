// Postgres connection to the Supabase database (postgres.js). Schema: supabase/migrations/.
import postgres from "postgres";
import { env, settings } from "./env.ts";

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;
export type Db = Sql | Tx;

let client: Sql | null = null;

export function db(): Sql {
  if (!client) {
    client = postgres(settings().databaseUrl as string, {
      prepare: false, // required by Supabase's transaction pooler (Supavisor); harmless on direct connections
      max: Number(env("DB_POOL_MAX") ?? 3),
      idle_timeout: 20,
      connect_timeout: 15,
      transform: { undefined: null },
    });
  }
  return client;
}

/** For tests and the dev server shutdown. */
export async function closeDb(): Promise<void> {
  if (client) await client.end({ timeout: 5 });
  client = null;
}
