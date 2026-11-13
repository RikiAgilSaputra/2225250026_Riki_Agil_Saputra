// Passwords (bcrypt) and access tokens (JWT HS256). Port of app/core/security.py + deps.py.
import bcrypt from "bcryptjs";
import { sign, verify } from "hono/jwt";
import type { Db } from "./db.ts";
import { settings } from "./env.ts";
import { ApiError } from "./errors.ts";

// Cost 10 keeps hashing inside the Edge Function CPU budget; existing cost-12 hashes still verify.
const BCRYPT_ROUNDS = 10;

export interface User {
  id: string;
  role: string;
  username: string;
  password_hash: string;
  display_name: string;
  status: string;
  preferences: Record<string, unknown> | null;
}

export interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  grade: number;
  join_code: string;
  settings: Record<string, unknown> | null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function createAccessToken(userId: string, role: string): Promise<[string, number]> {
  const ttl = settings().jwtAccessTtlMinutes * 60;
  const payload = { sub: userId, role, exp: Math.floor(Date.now() / 1000) + ttl };
  return [await sign(payload, settings().jwtSecret, "HS256"), ttl];
}

export async function currentUser(sql: Db, authorization: string | undefined): Promise<User> {
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    throw new ApiError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu.");
  }
  let sub: unknown;
  try {
    const payload = await verify(authorization.split(" ").slice(1).join(" "), settings().jwtSecret, "HS256");
    sub = payload.sub;
  } catch {
    throw new ApiError(401, "TOKEN_EXPIRED", "Sesi berakhir. Silakan masuk lagi.");
  }
  const [user] = await sql<User[]>`select * from users where id = ${String(sub)}`;
  if (!user || user.status !== "active") throw new ApiError(401, "UNAUTHENTICATED", "Akun tidak ditemukan.");
  return user;
}

export function requireRole(user: User, ...roles: string[]): void {
  if (!roles.includes(user.role)) throw new ApiError(403, "FORBIDDEN", "Kamu tidak memiliki akses ke halaman ini.");
}

export async function studentClass(sql: Db, studentId: string): Promise<ClassRow | null> {
  const [cls] = await sql<ClassRow[]>`
    select c.* from classes c join class_members m on m.class_id = c.id where m.student_id = ${studentId} limit 1`;
  return cls ?? null;
}

export async function teacherClass(sql: Db, teacherId: string): Promise<ClassRow | null> {
  const [cls] = await sql<ClassRow[]>`select * from classes where teacher_id = ${teacherId} limit 1`;
  return cls ?? null;
}

/** Class of a student, or the first class of a teacher. */
export function classFor(sql: Db, user: User): Promise<ClassRow | null> {
  return user.role === "student" ? studentClass(sql, user.id) : teacherClass(sql, user.id);
}

export function classSettings(cls: ClassRow | null): {
  ai_enabled: boolean;
  daily_quota: number;
  allow_full_solution: boolean;
  leaderboard_enabled: boolean;
} {
  const defaults = {
    ai_enabled: false, daily_quota: settings().modelerDefaultDailyQuota,
    allow_full_solution: true, leaderboard_enabled: true,
  };
  return { ...defaults, ...((cls?.settings ?? {}) as object) } as typeof defaults;
}
