from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user, student_class
from app.core.errors import ApiError
from app.models import ClassRoom, ModelerSubmission, User
from app.services.modeler import service
from app.services.modeler.guard import MAX_CHARS

router = APIRouter(prefix="/modeler", tags=["modeler"])


def _class_for(db: Session, user: User) -> ClassRoom | None:
    if user.role == "student":
        return student_class(db, user.id)
    return db.query(ClassRoom).filter(ClassRoom.teacher_id == user.id).first()


class AnalyzeIn(BaseModel):
    text: str = Field(max_length=MAX_CHARS * 2)


@router.get("/quota")
def quota(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = service.class_settings(_class_for(db, user))
    used = service.used_today(db, user.id)
    return {"enabled": settings["ai_enabled"] or user.role != "student", "daily_quota": settings["daily_quota"],
            "remaining": max(0, settings["daily_quota"] - used), "max_chars": MAX_CHARS,
            "allow_full_solution": settings["allow_full_solution"]}


@router.post("/analyze")
def analyze(body: AnalyzeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cls = _class_for(db, user)
    sub = service.analyze(db, user, cls, body.text)
    settings = service.class_settings(cls)
    out = {"submission_id": sub.id, "status": sub.status, "cached": sub.cached,
           "quota_remaining": max(0, settings["daily_quota"] - service.used_today(db, user.id))}
    if sub.status in ("verified", "verified_special"):
        out["model"] = service.public_model(sub.model_json)
        out["allowed_modes"] = ["guided", "model_only"] + (["worked"] if settings["allow_full_solution"] else [])
        if sub.status == "verified_special":
            out["message"] = "Kedua garis sejajar atau berimpit, jadi tidak ada penyelesaian tunggal."
    else:
        out["message"] = service.MESSAGES.get(sub.status, service.MESSAGES["rejected"])
        if sub.status == "not_spldv" and sub.model_json:
            out["reason"] = sub.model_json.get("not_spldv_reason")
    return out


class RatingIn(BaseModel):
    rating: int = Field(ge=-1, le=1)


@router.post("/{submission_id}/rating")
def rate(submission_id: str, body: RatingIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.get(ModelerSubmission, submission_id)
    if sub is None or sub.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Model tidak ditemukan.")
    sub.rating = body.rating
    db.commit()
    return {"ok": True}
