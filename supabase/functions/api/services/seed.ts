// Demo data so the app is usable immediately after the first start (SEED_DEMO). Port of app/seed.py.
import { hashPassword } from "../lib/auth.ts";
import type { Sql } from "../lib/db.ts";
import { addDays, today, weekStart } from "./progress.ts";

const DEMO_CLASSMATES: [string, number][] = [["Sephie", 180], ["Daniel", 120], ["Maya", 95], ["Liam", 60]];

let done = false;

export async function seed(sql: Sql): Promise<void> {
  if (done) return;
  const [exists] = await sql`select 1 from users where username = 'guru'`;
  if (exists) {
    done = true;
    return;
  }
  const [teacherHash, studentHash, demoHash] = await Promise.all([
    hashPassword("guru123"), hashPassword("siswa123"), hashPassword("demo1234"),
  ]);
  await sql.begin(async (tx) => {
    // Two cold starts can race: the unique username makes the loser roll back.
    const [teacher] = await tx`
      insert into users (role, username, password_hash, display_name)
      values ('teacher', 'guru', ${teacherHash}, 'Bu Rina') on conflict (username) do nothing returning id`;
    if (!teacher) return;
    const settingsJson = { ai_enabled: true, daily_quota: 10, allow_full_solution: true, leaderboard_enabled: true };
    const [cls] = await tx`
      insert into classes (teacher_id, name, grade, join_code, settings)
      values (${teacher.id}, 'Kelas 8A', 8, 'K7Q2MX', ${tx.json(settingsJson)}) returning id`;
    const [student] = await tx`
      insert into users (role, username, password_hash, display_name)
      values ('student', 'siswa', ${studentHash}, 'Nadia') returning id`;
    await tx`insert into class_members (class_id, student_id) values (${cls.id}, ${student.id})`;
    // Classmates with some weekly points so the class board is not empty
    for (const [i, [name, pts]] of DEMO_CLASSMATES.entries()) {
      const [u] = await tx`
        insert into users (role, username, password_hash, display_name)
        values ('student', ${`demo${i + 1}`}, ${demoHash}, ${name}) returning id`;
      await tx`insert into class_members (class_id, student_id) values (${cls.id}, ${u.id})`;
      await tx`insert into daily_activity (student_id, day, seconds, points, problems_completed)
               values (${u.id}, ${weekStart()}, 900, ${pts}, ${Math.floor(pts / 40)})`;
    }
    // A short streak history for the demo student (yesterday and the day before)
    for (const back of [1, 2]) {
      await tx`insert into daily_activity (student_id, day, seconds, points, problems_completed)
               values (${student.id}, ${addDays(today(), -back)}, 1300, 40, 1)`;
    }
  });
  done = true;
}
