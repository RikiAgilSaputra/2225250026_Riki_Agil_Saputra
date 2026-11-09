from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user, student_class
from app.core.errors import ApiError
from app.core.security import create_access_token, hash_password, verify_password
from app.models import ClassMember, ClassRoom, User

router = APIRouter(tags=["auth"])


class LoginIn(BaseModel):
    username: str = Field(max_length=30)
    password: str = Field(max_length=100)


class RegisterIn(BaseModel):
    join_code: str = Field(min_length=6, max_length=6)
    display_name: str = Field(min_length=1, max_length=40)
    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-z0-9_.]+$")
    password: str = Field(min_length=6, max_length=100)


def user_out(db: Session, user: User) -> dict:
    cls = student_class(db, user.id) if user.role == "student" else db.scalar(
        select(ClassRoom).where(ClassRoom.teacher_id == user.id)
    )
    return {
        "id": user.id, "role": user.role, "username": user.username, "display_name": user.display_name,
        "class": {"id": cls.id, "name": cls.name, "join_code": cls.join_code if user.role != "student" else None}
        if cls else None,
        "preferences": user.preferences or {},
    }


def _token_response(db: Session, user: User) -> dict:
    token, ttl = create_access_token(user.id, user.role)
    return {"access_token": token, "expires_in": ttl, "user": user_out(db, user)}


@router.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username.strip().lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise ApiError(401, "INVALID_CREDENTIALS", "Username atau password salah.")
    if user.status != "active":
        raise ApiError(403, "ACCOUNT_PENDING", "Akunmu belum aktif.")
    return _token_response(db, user)


@router.post("/auth/register-student", status_code=201)
def register_student(body: RegisterIn, db: Session = Depends(get_db)):
    cls = db.scalar(select(ClassRoom).where(ClassRoom.join_code == body.join_code.upper()))
    if cls is None:
        raise ApiError(400, "INVALID_JOIN_CODE", "Kode kelas tidak ditemukan. Tanyakan ke gurumu.")
    if db.scalar(select(User).where(User.username == body.username)):
        raise ApiError(409, "USERNAME_TAKEN", "Username sudah dipakai. Coba yang lain.")
    user = User(role="student", username=body.username, password_hash=hash_password(body.password),
                display_name=body.display_name.strip())
    db.add(user)
    db.flush()
    db.add(ClassMember(class_id=cls.id, student_id=user.id))
    db.commit()
    return _token_response(db, user)


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_out(db, user)


class PrefsIn(BaseModel):
    dark_mode: bool | None = None
    large_text: bool | None = None


@router.patch("/me")
def update_me(body: PrefsIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    prefs = dict(user.preferences or {})
    prefs.update({k: v for k, v in body.model_dump().items() if v is not None})
    user.preferences = prefs
    db.commit()
    return user_out(db, user)
