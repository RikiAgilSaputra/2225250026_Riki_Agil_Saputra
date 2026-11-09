from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.content import load_content
from app.core.db import get_db
from app.core.deps import get_current_user, student_class
from app.core.errors import ApiError
from app.models import ModuleProgress, Note, User
from app.routers.content import module_status, module_summary
from app.services import progress as prog
from app.services.modeler.service import class_settings

router = APIRouter(tags=["home"])


def greeting() -> str:
    h = datetime.now(prog.WIB).hour
    return "Selamat pagi" if h < 11 else "Selamat siang" if h < 15 else "Selamat sore" if h < 18 else "Selamat malam"


@router.get("/dashboard")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    content = load_content()["modules"]
    status = module_status(db, user)
    last = db.scalars(
        select(ModuleProgress).where(ModuleProgress.student_id == user.id).order_by(ModuleProgress.updated_at.desc())
    ).first()
    cont_id = last.module_id if last else next(iter(content))
    if last and status[cont_id]["status"] == "completed":
        ids = list(content)
        later = [i for i in ids[ids.index(cont_id) + 1:] if status[i]["status"] != "completed"]
        cont_id = later[0] if later else cont_id
    cm = content[cont_id]
    cls = student_class(db, user.id)
    settings = class_settings(cls)
    points = prog.total_points(db, user.id)
    skills = [module_summary(m, status[m["id"]]) for m in content.values() if m.get("method")]
    prereq = [module_summary(m, status[m["id"]]) for m in content.values() if m["kind"] == "prerequisite"]
    literacy = [module_summary(m, status[m["id"]]) for m in content.values() if m["kind"] == "literacy"]
    return {
        "greeting": greeting(),
        "name": user.display_name,
        "class_name": cls.name if cls else None,
        "streak": prog.streak(db, user.id),
        "points": points,
        "level": points // prog.LEVEL_POINTS + 1,
        "level_progress": round(100 * (points % prog.LEVEL_POINTS) / prog.LEVEL_POINTS),
        "daily_goal": prog.daily_goal(db, user.id),
        "continue": module_summary(cm, status[cont_id]),
        "skills": skills,
        "prerequisites": prereq,
        "literacy": literacy,
        "board": prog.class_board(db, cls.id, user.id) if cls and settings["leaderboard_enabled"] else None,
        "challenge": prog.weekly_challenge(db, user.id),
        "ai_enabled": settings["ai_enabled"] or user.role != "student",
    }


@router.get("/progress/summary")
def progress_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    status = module_status(db, user)
    content = load_content()["modules"]
    return {
        "modules": [module_summary(m, status[m["id"]]) for m in content.values()],
        "literacy": prog.literacy_profile(db, [user.id]),
        "points": prog.total_points(db, user.id),
        "streak": prog.streak(db, user.id),
        "daily_goal": prog.daily_goal(db, user.id),
    }


class NoteIn(BaseModel):
    module_id: str | None = None
    title: str = Field(default="", max_length=80)
    body: str = Field(default="", max_length=5000)


def note_out(n: Note) -> dict:
    return {"id": n.id, "module_id": n.module_id, "title": n.title, "body": n.body, "updated_at": n.updated_at.isoformat()}


@router.get("/notes")
def list_notes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Note).where(Note.student_id == user.id).order_by(Note.updated_at.desc()))
    return {"items": [note_out(n) for n in rows]}


@router.post("/notes", status_code=201)
def create_note(body: NoteIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = Note(student_id=user.id, **body.model_dump())
    db.add(n)
    db.commit()
    return note_out(n)


@router.patch("/notes/{note_id}")
def update_note(note_id: str, body: NoteIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Note, note_id)
    if n is None or n.student_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Catatan tidak ditemukan.")
    n.title, n.body, n.module_id = body.title, body.body, body.module_id
    db.commit()
    return note_out(n)


@router.delete("/notes/{note_id}")
def delete_note(note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Note, note_id)
    if n is None or n.student_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Catatan tidak ditemukan.")
    db.delete(n)
    db.commit()
    return {"ok": True}
