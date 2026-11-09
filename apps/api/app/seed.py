"""Demo data so the app is usable immediately after the first start."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import ClassMember, ClassRoom, DailyActivity, User
from app.services import progress as prog

DEMO_CLASSMATES = [("Sephie", 180), ("Daniel", 120), ("Maya", 95), ("Liam", 60)]


def seed(db: Session) -> None:
    if db.scalar(select(User).where(User.username == "guru")):
        return
    teacher = User(role="teacher", username="guru", password_hash=hash_password("guru123"), display_name="Bu Rina")
    db.add(teacher)
    db.flush()
    cls = ClassRoom(teacher_id=teacher.id, name="Kelas 8A", grade=8, join_code="K7Q2MX",
                    settings={"ai_enabled": True, "daily_quota": 10, "allow_full_solution": True,
                              "leaderboard_enabled": True})
    db.add(cls)
    db.flush()
    student = User(role="student", username="siswa", password_hash=hash_password("siswa123"), display_name="Nadia")
    db.add(student)
    db.flush()
    db.add(ClassMember(class_id=cls.id, student_id=student.id))
    # Classmates with some weekly points so the class board is not empty
    for i, (name, pts) in enumerate(DEMO_CLASSMATES):
        u = User(role="student", username=f"demo{i + 1}", password_hash=hash_password("demo1234"), display_name=name)
        db.add(u)
        db.flush()
        db.add(ClassMember(class_id=cls.id, student_id=u.id))
        db.add(DailyActivity(student_id=u.id, day=prog.week_start().isoformat(), seconds=900, points=pts,
                             problems_completed=pts // 40))
    # A short streak history for the demo student (yesterday and the day before)
    for back in (1, 2):
        d = (prog.today() - timedelta(days=back)).isoformat()
        db.add(DailyActivity(student_id=student.id, day=d, seconds=1300, points=40, problems_completed=1))
    db.commit()
