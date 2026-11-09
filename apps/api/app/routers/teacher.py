from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.content import load_content
from app.core.db import get_db
from app.core.deps import require_role
from app.core.errors import ApiError
from app.models import Attempt, ClassMember, ClassRoom, ModelerSubmission, StepAttempt, User
from app.routers.content import module_status
from app.services import progress as prog
from app.services.modeler.service import class_settings

router = APIRouter(prefix="/teacher", tags=["teacher"])
teacher_only = require_role("teacher", "admin")


def _own_class(db: Session, user: User, class_id: str | None = None) -> ClassRoom:
    q = select(ClassRoom).where(ClassRoom.teacher_id == user.id)
    if class_id:
        q = q.where(ClassRoom.id == class_id)
    cls = db.scalar(q)
    if cls is None:
        raise ApiError(404, "NOT_FOUND", "Kelas tidak ditemukan.")
    return cls


@router.get("/overview")
def overview(user: User = Depends(teacher_only), db: Session = Depends(get_db)):
    cls = _own_class(db, user)
    students = db.scalars(
        select(User).join(ClassMember, ClassMember.student_id == User.id).where(ClassMember.class_id == cls.id)
    ).all()
    modules = load_content()["modules"]
    rows = []
    for s in students:
        st = module_status(db, s)
        scores = [v["best_score"] for v in st.values() if v["best_score"] is not None]
        lit = prog.literacy_profile(db, [s.id])["indicators"]
        rows.append({
            "id": s.id, "name": s.display_name, "username": s.username,
            "points_week": prog.weekly_points(db, s.id), "streak": prog.streak(db, s.id),
            "modules_completed": sum(1 for v in st.values() if v["status"] == "completed"),
            "avg_score": round(sum(scores) / len(scores)) if scores else None,
            "literacy": lit,
        })
    ids = [s.id for s in students]
    # Hardest steps: error rate per (problem, step) across the class
    hard = []
    if ids:
        q = (
            select(Attempt.problem_id, StepAttempt.step_id, func.count(),
                   func.sum(case((StepAttempt.is_correct.is_(False), 1), else_=0)))
            .join(Attempt, Attempt.id == StepAttempt.attempt_id)
            .where(Attempt.student_id.in_(ids), Attempt.source == "content")
            .group_by(Attempt.problem_id, StepAttempt.step_id)
        )
        for pid, sid, n, wrong in db.execute(q):
            if n >= 2:
                hard.append({"problem_id": pid, "step_id": sid, "tries": n, "error_rate": round(100 * (wrong or 0) / n)})
        hard.sort(key=lambda r: -r["error_rate"])
    subs = db.scalars(
        select(ModelerSubmission).where(ModelerSubmission.class_id == cls.id)
        .order_by(ModelerSubmission.created_at.desc()).limit(20)
    ).all()
    return {
        "class": {"id": cls.id, "name": cls.name, "join_code": cls.join_code, "settings": class_settings(cls)},
        "students": sorted(rows, key=lambda r: r["name"]),
        "literacy": prog.literacy_profile(db, ids),
        "hardest_steps": hard[:8],
        "module_count": len(modules),
        "submissions": [{"id": x.id, "text": x.input_text[:160], "status": x.status, "rating": x.rating,
                         "created_at": x.created_at.isoformat()} for x in subs],
    }


class SettingsIn(BaseModel):
    ai_enabled: bool | None = None
    daily_quota: int | None = Field(default=None, ge=0, le=30)
    allow_full_solution: bool | None = None
    leaderboard_enabled: bool | None = None


@router.patch("/classes/{class_id}/settings")
def update_settings(class_id: str, body: SettingsIn, user: User = Depends(teacher_only), db: Session = Depends(get_db)):
    cls = _own_class(db, user, class_id)
    cls.settings = {**class_settings(cls), **{k: v for k, v in body.model_dump().items() if v is not None}}
    db.commit()
    return class_settings(cls)
