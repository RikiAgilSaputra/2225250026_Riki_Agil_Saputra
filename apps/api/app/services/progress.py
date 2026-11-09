"""Points, streak, daily goal, class board and literacy profile.

CLT-friendly gamification (decided with the product owner): personal goals and
streak are visible; the board is class-only, uses nicknames and can be turned
off by the teacher. No penalties are shown to students.
"""

from datetime import UTC, date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Attempt, ClassMember, DailyActivity, ModuleProgress, User

WIB = timezone(timedelta(hours=7), "WIB")  # no DST; avoids needing tzdata on Windows
DAILY_GOAL_MINUTES = 20
WEEKLY_CHALLENGE = 5
POINTS_PER_STEP = 10
COMPLETION_BONUS = 20
LEVEL_POINTS = 200
HINT_FACTOR = {0: 1.0, 1: 1.0, 2: 0.75, 3: 0.5}


def today() -> date:
    return datetime.now(WIB).date()


def week_start(d: date | None = None) -> date:
    d = d or today()
    return d - timedelta(days=d.weekday())


def step_score(state: dict) -> float:
    if state.get("status") != "correct":
        return 0.0
    return HINT_FACTOR.get(state.get("hint_level", 0), 0.5)


def activity(db: Session, student_id: str, d: date | None = None) -> DailyActivity:
    key = (d or today()).isoformat()
    row = db.get(DailyActivity, (student_id, key))
    if row is None:
        row = DailyActivity(student_id=student_id, day=key, seconds=0, points=0, problems_completed=0)
        db.add(row)
        db.flush()  # make it visible to db.get() for later calls in the same request
    return row


def add_time(db: Session, student_id: str, seconds: int) -> None:
    activity(db, student_id).seconds += max(0, min(seconds, 300))  # cap idle time per event


def total_points(db: Session, student_id: str) -> int:
    return int(db.scalar(select(func.coalesce(func.sum(DailyActivity.points), 0)).where(DailyActivity.student_id == student_id)))


def streak(db: Session, student_id: str) -> int:
    days = {
        r.day for r in db.scalars(select(DailyActivity).where(DailyActivity.student_id == student_id))
        if r.seconds > 0 or r.points > 0
    }
    d = today()
    if d.isoformat() not in days:
        d -= timedelta(days=1)
    n = 0
    while d.isoformat() in days:
        n += 1
        d -= timedelta(days=1)
    return n


def daily_goal(db: Session, student_id: str) -> dict:
    start = week_start()
    rows = {
        r.day: r for r in db.scalars(
            select(DailyActivity).where(DailyActivity.student_id == student_id, DailyActivity.day >= start.isoformat())
        )
    }
    week = []
    for i in range(7):
        d = start + timedelta(days=i)
        r = rows.get(d.isoformat())
        minutes = (r.seconds // 60) if r else 0
        week.append({"day": d.isoformat(), "label": ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][i],
                     "done": minutes >= DAILY_GOAL_MINUTES, "active": bool(r and (r.seconds or r.points)),
                     "is_today": d == today()})
    t = rows.get(today().isoformat())
    return {"minutes": (t.seconds // 60) if t else 0, "target": DAILY_GOAL_MINUTES, "week": week}


def weekly_points(db: Session, student_id: str) -> int:
    return int(db.scalar(
        select(func.coalesce(func.sum(DailyActivity.points), 0)).where(
            DailyActivity.student_id == student_id, DailyActivity.day >= week_start().isoformat()
        )
    ))


def weekly_challenge(db: Session, student_id: str) -> dict:
    done = int(db.scalar(
        select(func.coalesce(func.sum(DailyActivity.problems_completed), 0)).where(
            DailyActivity.student_id == student_id, DailyActivity.day >= week_start().isoformat()
        )
    ))
    return {"done": min(done, WEEKLY_CHALLENGE), "target": WEEKLY_CHALLENGE,
            "label": f"Selesaikan {WEEKLY_CHALLENGE} soal minggu ini untuk membuka Tantangan Literasi L3"}


def class_board(db: Session, class_id: str, me: str) -> list[dict]:
    members = db.scalars(
        select(User).join(ClassMember, ClassMember.student_id == User.id).where(ClassMember.class_id == class_id)
    ).all()
    rows = sorted(
        ({"id": u.id, "name": u.display_name, "points": weekly_points(db, u.id), "me": u.id == me} for u in members),
        key=lambda r: -r["points"],
    )
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    top = rows[:5]
    if not any(r["me"] for r in top):
        top += [r for r in rows if r["me"]]
    return [{k: v for k, v in r.items() if k != "id"} for r in top]


def finish_attempt(db: Session, attempt: Attempt) -> dict:
    """Score the attempt, award bonus points, update module progress."""
    steps = attempt.problem_snapshot["steps"]
    graded = [s for s in steps if not s.get("prefilled")]
    if graded:
        score = round(100 * sum(step_score(attempt.state.get(s["id"], {})) for s in graded) / len(graded))
    else:
        score = 100
    attempt.score = score
    attempt.completed_at = datetime.now(UTC)
    bonus = COMPLETION_BONUS if score >= 75 and graded else 0
    attempt.points_awarded += bonus
    act = activity(db, attempt.student_id)
    act.points += bonus
    act.problems_completed += 1
    if attempt.module_id:
        mp = db.get(ModuleProgress, (attempt.student_id, attempt.module_id))
        if mp is None:
            mp = ModuleProgress(student_id=attempt.student_id, module_id=attempt.module_id, status="in_progress", last_screen=0)
            db.add(mp)
        if attempt.problem_snapshot.get("mode") == "independent" or attempt.source != "content":
            mp.best_score = max(mp.best_score or 0, score)
            if score >= 75:
                mp.status = "completed"
    return {"score": score, "bonus": bonus}


STAGE_INDICATOR = {1: "merumuskan", 2: "merumuskan", 3: "merumuskan", 4: "menerapkan",
                   5: "menafsirkan", 6: "menafsirkan", 7: "penalaran"}


def literacy_profile(db: Session, student_ids: list[str]) -> dict:
    """Average step score per literacy indicator (docs/13 §8) and per context."""
    sums: dict[str, list[float]] = {k: [] for k in ("merumuskan", "menerapkan", "menafsirkan", "penalaran")}
    contexts: dict[str, list[float]] = {}
    if not student_ids:
        return {"indicators": {}, "contexts": {}}
    attempts = db.scalars(select(Attempt).where(Attempt.student_id.in_(student_ids), Attempt.completed_at.is_not(None)))
    for a in attempts:
        ctx = (a.problem_snapshot.get("literacy") or {}).get("context_category")
        scores = []
        for s in a.problem_snapshot["steps"]:
            stage = s.get("modeling_stage")
            if not stage or s.get("prefilled"):
                continue
            sc = step_score(a.state.get(s["id"], {}))
            sums[STAGE_INDICATOR[stage]].append(sc)
            scores.append(sc)
        if ctx and scores:
            contexts.setdefault(ctx, []).extend(scores)
    avg = lambda v: round(100 * sum(v) / len(v)) if v else None  # noqa: E731
    return {"indicators": {k: avg(v) for k, v in sums.items()}, "contexts": {k: avg(v) for k, v in contexts.items()}}
