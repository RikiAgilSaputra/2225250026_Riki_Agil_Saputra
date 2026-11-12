from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.content import get_module, get_problem, load_content
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.models import Attempt, ModuleProgress, User
from app.services import progress as prog
from app.services.step_builder import METHOD_LABELS

router = APIRouter(tags=["content"])


def module_status(db: Session, user: User) -> dict[str, dict]:
    rows = db.scalars(select(ModuleProgress).where(ModuleProgress.student_id == user.id)).all()
    done = {
        a.problem_id for a in db.scalars(
            select(Attempt).where(Attempt.student_id == user.id, Attempt.completed_at.is_not(None))
        )
    }
    out = {}
    for mid, m in load_content()["modules"].items():
        r = next((x for x in rows if x.module_id == mid), None)
        total = len(m["screens"]) + len(m["problem_ids"])
        seen = min((r.last_screen + 1) if r else 0, len(m["screens"]))
        solved = len([p for p in m["problem_ids"] if p in done])
        out[mid] = {
            "status": r.status if r else "not_started",
            "last_screen": r.last_screen if r else 0,
            "best_score": r.best_score if r else None,
            "progress": round(100 * (seen + solved) / total) if total else 0,
            "solved": solved,
        }
    return out


def module_summary(m: dict, st: dict) -> dict:
    return {
        "id": m["id"], "kind": m["kind"], "title": m["title"], "subtitle": m.get("subtitle", ""),
        "icon": m.get("icon"), "method": m.get("method"), "level": m.get("level"),
        "screens": len(m["screens"]), "problems": len(m["problem_ids"]), **st,
    }


@router.get("/modules")
def list_modules(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    status = module_status(db, user)
    return {"items": [module_summary(m, status[m["id"]]) for m in load_content()["modules"].values()]}


@router.get("/learning-path")
def learning_path(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Belajar & Literasi: every module in one staged path, with per-stage progress and the next module."""
    content = load_content()
    status = module_status(db, user)
    stages, next_id = [], None
    for stage in content["path"]["stages"]:
        mods = []
        for item in stage["modules"]:
            m = content["modules"][item["id"]]
            mods.append({**module_summary(m, status[m["id"]]), "role": item.get("role", "inti")})
            if next_id is None and status[m["id"]]["status"] != "completed":
                next_id = m["id"]
        done = sum(1 for x in mods if x["status"] == "completed")
        stages.append({
            "id": stage["id"], "title": stage["title"], "description": stage.get("description", ""),
            "show_cycle": stage.get("show_cycle", False), "modules": mods,
            "completed": done, "progress": round(sum(x["progress"] for x in mods) / len(mods)) if mods else 0,
        })
    return {"title": content["path"]["title"], "description": content["path"].get("description", ""),
            "stages": stages, "next_module_id": next_id}


@router.get("/modules/{module_id}")
def module_detail(module_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = get_module(module_id)
    if m is None:
        raise ApiError(404, "NOT_FOUND", "Modul tidak ditemukan.")
    st = module_status(db, user)[module_id]
    problems = []
    done = {a.problem_id: a.score for a in db.scalars(
        select(Attempt).where(Attempt.student_id == user.id, Attempt.completed_at.is_not(None))
    )}
    for pid in m["problem_ids"]:
        p = get_problem(pid)
        problems.append({"id": pid, "title": p["title"], "mode": p["mode"], "method": p.get("method"),
                         "has_story": bool(p.get("story")), "literacy": p.get("literacy"),
                         "best_score": done.get(pid)})
    return {
        **module_summary(m, st),
        "objective": m.get("objective"),
        "source": m.get("source"),
        "recall": m.get("recall", []),
        "screens": m["screens"],
        "method_card": ({**m["method_card"], "name": METHOD_LABELS.get(m.get("method"), "")}
                        if m.get("method_card") else None),
        "problem_list": problems,
        "template": m.get("template"),
    }


class ProgressIn(BaseModel):
    last_screen: int = Field(ge=0)
    seconds: int = Field(default=0, ge=0, le=600)


@router.put("/progress/{module_id}")
def save_progress(module_id: str, body: ProgressIn, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    if get_module(module_id) is None:
        raise ApiError(404, "NOT_FOUND", "Modul tidak ditemukan.")
    row = db.get(ModuleProgress, (user.id, module_id))
    if row is None:
        row = ModuleProgress(student_id=user.id, module_id=module_id, status="in_progress", last_screen=0)
        db.add(row)
    row.last_screen = max(row.last_screen, body.last_screen)
    prog.add_time(db, user.id, body.seconds)
    db.commit()
    return {"ok": True}


@router.get("/method-cards")
def method_cards(user: User = Depends(get_current_user)):
    cards = []
    for m in load_content()["modules"].values():
        if m.get("method_card"):
            cards.append({"method": m["method"], "name": METHOD_LABELS[m["method"]], "module_id": m["id"],
                          **m["method_card"]})
    return {"items": cards}
