// Small request helpers shared by the routes.
import type { Context } from "hono";
import type { z } from "zod";
import { currentUser, type User } from "./auth.ts";
import { db } from "./db.ts";
import { ApiError } from "./errors.ts";

/** Validates the JSON body; errors look like FastAPI's 422 in the Python version (docs/09 §1). */
export async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    const text = await c.req.text();
    raw = text ? JSON.parse(text) : undefined;
  } catch {
    raw = undefined;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION_ERROR", "Isian belum lengkap atau tidak sesuai.", {
      fields: parsed.error.issues.map((i) => i.path.join(".")),
    });
  }
  return parsed.data;
}

export function user(c: Context): Promise<User> {
  return currentUser(db(), c.req.header("authorization"));
}

export const iso = (d: Date | string | null | undefined): string | null =>
  d == null ? null : (d instanceof Date ? d : new Date(d)).toISOString();
