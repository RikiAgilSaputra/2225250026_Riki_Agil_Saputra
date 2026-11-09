import copy
import random
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.content import get_problem, rebuild_with_method
from app.core.db import get_db
from app.core.deps import get_current_user, student_class
from app.core.errors import ApiError
from app.models import Attempt, ModelerSubmission, StepAttempt, User
from app.services import progress as prog
from app.services.generator import generate
from app.services.modeler.service import class_settings, problem_from_submission
from app.services.step_builder import METHOD_LABELS
from app.services.step_checker import check_step

router = APIRouter(tags=["attempts"])

PUBLIC_STEP_KEYS = ("id", "instruction", "check", "choices", "modeling_stage", "show_graph", "variable", "prefilled")


def sanitize(problem: dict, state: dict) -> dict:
    """Problem as the client may see it: no answer keys for unsolved steps."""
    steps = []
    for s in problem["steps"]:
        st = state.get(s["id"], {})
        out = {k: s[k] for k in PUBLIC_STEP_KEYS if k in s}
        level = st.get("hint_level", 0)
        out["hints"] = s.get("hints", [])[:level]
        out["status"] = "prefilled" if s.get("prefilled") else st.get("status", "todo")
        out["tries"] = st.get("tries", 0)
        if s.get("prefilled") or out["status"] in ("correct", "revealed"):
            out["display"] = s.get("display")
        steps.append(out)
    story = problem.get("story")
    if story:
        story = {
            "segments": [{"id": g["id"], "text": g["text"]} for g in story.get("segments", [])],
            "variables": story.get("variables"),
            "table": story.get("table"),
        }
    return {
        "id": problem["id"], "title": problem.get("title"), "mode": problem.get("mode"),
        "method": problem.get("method"), "method_label": METHOD_LABELS.get(problem.get("method"), ""),
        "source": problem.get("source"), "module_id": problem.get("module_id"),
        "system": problem.get("system"), "system_display": problem.get("system_display"),
        "story": story, "literacy": problem.get("literacy"), "graph": problem.get("graph"),
        "steps": steps,
    }


def attempt_out(a: Attempt) -> dict:
    return {
        "attempt_id": a.id, "problem": sanitize(a.problem_snapshot, a.state),
        "completed": a.completed_at is not None, "score": a.score, "points": a.points_awarded,
        "template": a.problem_snapshot.get("template"),
    }


class AttemptIn(BaseModel):
    problem_id: str | None = None
    template: str | None = Field(default=None, pattern=r"^(graph|substitution|elimination|mixed|story)$")
    module_id: str | None = None
    submission_id: str | None = None
    method: str | None = Field(default=None, pattern=r"^(graph|substitution|elimination|mixed)$")
    mode: str | None = Field(default=None, pattern=r"^(guided|model_only|worked)$")


@router.post("/attempts", status_code=201)
def start_attempt(body: AttemptIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    source = "content"
    if body.problem_id:
        p = get_problem(body.problem_id)
        if p is None:
            raise ApiError(404, "NOT_FOUND", "Soal tidak ditemukan.")
        if body.method and p.get("system") and p.get("method") and body.method != p["method"] and p["mode"] == "independent":
            p = rebuild_with_method(p, body.method)
        p = copy.deepcopy(p)
    elif body.template:
        p = generate(body.template, random.randint(1, 10**9), module_id=body.module_id)
        p["template"] = body.template
        source = "generated"
    elif body.submission_id:
        sub = db.get(ModelerSubmission, body.submission_id)
        if sub is None or sub.user_id != user.id:
            raise ApiError(404, "NOT_FOUND", "Model tidak ditemukan.")
        if sub.status != "verified":
            raise ApiError(400, "VALIDATION_ERROR", "Model ini tidak bisa diselesaikan langkah demi langkah.")
        mode = body.mode or "guided"
        settings = class_settings(student_class(db, user.id)) if user.role == "student" else {"allow_full_solution": True}
        if mode == "worked" and not settings["allow_full_solution"]:
            raise ApiError(403, "FULL_SOLUTION_NOT_ALLOWED", "Gurumu menonaktifkan penyelesaian lengkap.")
        p = problem_from_submission(sub, body.method or "mixed", mode)
        if mode == "model_only":
            # Model is shown; the student solves without the define/translate scaffold.
            for s in p["steps"]:
                if s.get("modeling_stage") in (2, 3):
                    s["prefilled"] = True
        source = "ai"
    else:
        raise ApiError(400, "VALIDATION_ERROR", "Pilih soal terlebih dahulu.")

    a = Attempt(student_id=user.id, problem_id=p["id"], module_id=p.get("module_id"), source=source,
                method=p.get("method"), problem_snapshot=p, state={})
    db.add(a)
    db.commit()
    return attempt_out(a)


def _own_attempt(db: Session, attempt_id: str, user: User) -> Attempt:
    a = db.get(Attempt, attempt_id)
    if a is None or a.student_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Pengerjaan tidak ditemukan.")
    return a


def _step(a: Attempt, step_id: str) -> dict:
    s = next((s for s in a.problem_snapshot["steps"] if s["id"] == step_id), None)
    if s is None or s.get("prefilled"):
        raise ApiError(404, "NOT_FOUND", "Langkah tidak ditemukan.")
    return s


def _next_step(a: Attempt) -> str | None:
    for s in a.problem_snapshot["steps"]:
        if not s.get("prefilled") and a.state.get(s["id"], {}).get("status") not in ("correct", "revealed"):
            return s["id"]
    return None


def _maybe_finish(db: Session, a: Attempt, result: dict) -> None:
    if a.completed_at is None and _next_step(a) is None:
        fin = prog.finish_attempt(db, a)
        result.update(completed=True, score=fin["score"], bonus=fin["bonus"])


@router.get("/attempts/{attempt_id}")
def get_attempt(attempt_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return attempt_out(_own_attempt(db, attempt_id, user))


class StepIn(BaseModel):
    step_id: str
    answer: str | dict = Field()
    duration_ms: int = Field(default=0, ge=0, le=3_600_000)


@router.post("/attempts/{attempt_id}/steps")
def submit_step(attempt_id: str, body: StepIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _own_attempt(db, attempt_id, user)
    s = _step(a, body.step_id)
    state = dict(a.state)
    st = dict(state.get(s["id"], {"status": "todo", "hint_level": 0, "tries": 0}))
    if st["status"] in ("correct", "revealed"):
        raise ApiError(400, "VALIDATION_ERROR", "Langkah ini sudah selesai.")
    res = check_step(s, body.answer)
    st["tries"] += 1
    if res.correct:
        st["status"] = "correct"
    state[s["id"]] = st
    a.state = state
    raw = body.answer if isinstance(body.answer, str) else str(body.answer)
    db.add(StepAttempt(attempt_id=a.id, step_id=s["id"], modeling_stage=s.get("modeling_stage"),
                       answer_raw=raw[:300], is_correct=res.correct, error_code=res.error_code,
                       hint_level_used=st["hint_level"], duration_ms=body.duration_ms))
    prog.add_time(db, user.id, body.duration_ms // 1000)
    points = 0
    if res.correct:
        points = round(prog.POINTS_PER_STEP * prog.step_score(st))
        a.points_awarded += points
        prog.activity(db, user.id).points += points
    out = {
        "correct": res.correct, "error_code": res.error_code, "feedback": res.feedback,
        "display": s.get("display") if res.correct else None, "tries": st["tries"],
        "suggest_hint": (not res.correct) and st["tries"] >= 3 and st["hint_level"] < 3,
        "points": points, "next_step_id": _next_step(a), "completed": False,
    }
    _maybe_finish(db, a, out)
    db.commit()
    return out


@router.post("/attempts/{attempt_id}/steps/{step_id}/hint")
def next_hint(attempt_id: str, step_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _own_attempt(db, attempt_id, user)
    s = _step(a, step_id)
    state = dict(a.state)
    st = dict(state.get(step_id, {"status": "todo", "hint_level": 0, "tries": 0}))
    st["hint_level"] = min(3, st["hint_level"] + 1)
    state[step_id] = st
    a.state = state
    db.commit()
    return {"level": st["hint_level"], "hints": s["hints"][: st["hint_level"]]}


@router.post("/attempts/{attempt_id}/steps/{step_id}/reveal")
def reveal(attempt_id: str, step_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _own_attempt(db, attempt_id, user)
    s = _step(a, step_id)
    state = dict(a.state)
    st = dict(state.get(step_id, {"status": "todo", "hint_level": 0, "tries": 0}))
    st["status"] = "revealed"
    state[step_id] = st
    a.state = state
    out = {"display": s.get("display"), "next_step_id": _next_step(a), "completed": False}
    _maybe_finish(db, a, out)
    db.commit()
    return out


class ExplanationIn(BaseModel):
    text: str = Field(max_length=280)


@router.post("/attempts/{attempt_id}/explanation")
def explain(attempt_id: str, body: ExplanationIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _own_attempt(db, attempt_id, user)
    a.explanation = body.text.strip()
    db.commit()
    return {"ok": True}


@router.get("/attempts")
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Attempt).where(Attempt.student_id == user.id, Attempt.completed_at.is_not(None))
        .order_by(Attempt.completed_at.desc()).limit(30)
    )
    return {"items": [{"id": a.id, "problem_id": a.problem_id, "title": a.problem_snapshot.get("title"),
                       "module_id": a.module_id, "score": a.score, "source": a.source,
                       "completed_at": (a.completed_at or datetime.now(UTC)).isoformat()} for a in rows]}
