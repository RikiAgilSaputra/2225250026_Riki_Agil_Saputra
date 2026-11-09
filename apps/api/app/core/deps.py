from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import ApiError
from app.core.security import decode_access_token
from app.models import ClassMember, ClassRoom, User


def get_current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ApiError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu.")
    try:
        payload = decode_access_token(authorization.split(" ", 1)[1])
    except Exception as exc:  # noqa: BLE001 - any JWT error is an auth failure
        raise ApiError(401, "TOKEN_EXPIRED", "Sesi berakhir. Silakan masuk lagi.") from exc
    user = db.get(User, payload.get("sub"))
    if user is None or user.status != "active":
        raise ApiError(401, "UNAUTHENTICATED", "Akun tidak ditemukan.")
    return user


def require_role(*roles: str):
    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ApiError(403, "FORBIDDEN", "Kamu tidak memiliki akses ke halaman ini.")
        return user

    return _dep


def student_class(db: Session, student_id: str) -> ClassRoom | None:
    return db.scalar(
        select(ClassRoom)
        .join(ClassMember, ClassMember.class_id == ClassRoom.id)
        .where(ClassMember.student_id == student_id)
    )
