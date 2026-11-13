// /auth/*, /me. Port of routers/auth.py.
import { Hono } from "hono";
import { z } from "zod";
import {
  createAccessToken, hashPassword, studentClass, teacherClass, type User, verifyPassword,
} from "../lib/auth.ts";
import { type Db, db } from "../lib/db.ts";
import { ApiError } from "../lib/errors.ts";
import { body, user } from "../lib/http.ts";

export const authRoutes = new Hono();

const LoginIn = z.object({ username: z.string().max(30), password: z.string().max(100) });
const RegisterIn = z.object({
  join_code: z.string().min(6).max(6),
  display_name: z.string().min(1).max(40),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/),
  password: z.string().min(6).max(100),
});
const PrefsIn = z.object({ dark_mode: z.boolean().nullish(), large_text: z.boolean().nullish() });

export async function userOut(sql: Db, u: User) {
  const cls = u.role === "student" ? await studentClass(sql, u.id) : await teacherClass(sql, u.id);
  return {
    id: u.id, role: u.role, username: u.username, display_name: u.display_name,
    class: cls ? { id: cls.id, name: cls.name, join_code: u.role !== "student" ? cls.join_code : null } : null,
    preferences: u.preferences ?? {},
  };
}

async function tokenResponse(sql: Db, u: User) {
  const [token, ttl] = await createAccessToken(u.id, u.role);
  return { access_token: token, expires_in: ttl, user: await userOut(sql, u) };
}

authRoutes.post("/auth/login", async (c) => {
  const b = await body(c, LoginIn);
  const sql = db();
  const [u] = await sql<User[]>`select * from users where username = ${b.username.trim().toLowerCase()}`;
  if (!u || !(await verifyPassword(b.password, u.password_hash))) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Username atau password salah.");
  }
  if (u.status !== "active") throw new ApiError(403, "ACCOUNT_PENDING", "Akunmu belum aktif.");
  return c.json(await tokenResponse(sql, u));
});

authRoutes.post("/auth/register-student", async (c) => {
  const b = await body(c, RegisterIn);
  const sql = db();
  const [cls] = await sql`select id from classes where join_code = ${b.join_code.toUpperCase()}`;
  if (!cls) throw new ApiError(400, "INVALID_JOIN_CODE", "Kode kelas tidak ditemukan. Tanyakan ke gurumu.");
  const taken = () => new ApiError(409, "USERNAME_TAKEN", "Username sudah dipakai. Coba yang lain.");
  const [exists] = await sql`select 1 from users where username = ${b.username}`;
  if (exists) throw taken();
  const hash = await hashPassword(b.password);
  const u = await sql.begin(async (tx) => {
    const [row] = await tx<User[]>`
      insert into users (role, username, password_hash, display_name)
      values ('student', ${b.username}, ${hash}, ${b.display_name.trim()})
      on conflict (username) do nothing returning *`;
    if (!row) throw taken();
    await tx`insert into class_members (class_id, student_id) values (${cls.id}, ${row.id})`;
    return row;
  });
  return c.json(await tokenResponse(sql, u), 201);
});

authRoutes.get("/me", async (c) => c.json(await userOut(db(), await user(c))));

authRoutes.patch("/me", async (c) => {
  const u = await user(c);
  const b = await body(c, PrefsIn);
  const prefs: Record<string, unknown> = { ...(u.preferences ?? {}) };
  for (const [k, v] of Object.entries(b)) if (v !== null && v !== undefined) prefs[k] = v;
  const sql = db();
  const [updated] = await sql<User[]>`update users set preferences = ${sql.json(prefs as never)} where id = ${u.id} returning *`;
  return c.json(await userOut(sql, updated));
});
