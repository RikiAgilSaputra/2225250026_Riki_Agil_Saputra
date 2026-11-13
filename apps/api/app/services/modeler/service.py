"""Modeler pipeline: guard → cache → Claude → verify (→ repair once) → store (docs/14 §4)."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ApiError
from app.models import ClassRoom, ModelerSubmission, User
from app.services.modeler import guard
from app.services.modeler.llm_client import LlmResult, ModelerBusy, ModelerUnavailable, call_model
from app.services.modeler.prompt import PROMPT_VERSION, repair_message, user_message
from app.services.modeler.schema import WordProblemModel
from app.services.modeler.verifier import verify
from app.services.step_builder import build_problem


MESSAGES = {
    "not_spldv": "Soal ini bukan SPLDV, jadi belum bisa dimodelkan di sini.",
    "unverified": "Aku belum yakin dengan modelnya. Coba Latih Pemodelan atau tanyakan gurumu.",
    "rejected": "Teks ini belum bisa diproses. Pastikan isinya soal cerita matematika.",
}


def class_settings(cls: ClassRoom | None) -> dict:
    defaults = {"ai_enabled": False, "daily_quota": get_settings().modeler_default_daily_quota,
                "allow_full_solution": True, "leaderboard_enabled": True}
    return {**defaults, **((cls.settings or {}) if cls else {})}


def used_today(db: Session, user_id: str) -> int:
    since = datetime.now(UTC) - timedelta(hours=24)
    return int(db.scalar(
        select(func.count()).select_from(ModelerSubmission).where(
            ModelerSubmission.user_id == user_id, ModelerSubmission.created_at >= since,
            ModelerSubmission.cached.is_(False),
        )
    ))


def month_cost(db: Session) -> float:
    start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    tin, tout = db.execute(
        select(func.coalesce(func.sum(ModelerSubmission.input_tokens), 0),
               func.coalesce(func.sum(ModelerSubmission.output_tokens), 0))
        .where(ModelerSubmission.created_at >= start)
    ).one()
    s = get_settings()  # Gemini prices per 1M tokens (docs/14 §10)
    return tin * s.modeler_price_in_per_m / 1_000_000 + tout * s.modeler_price_out_per_m / 1_000_000


def public_model(model: dict) -> dict:
    keep = ("variables", "equations", "question_text", "target", "target_label", "target_unit",
            "context_category", "known_facts", "irrelevant_facts")
    return {k: model[k] for k in keep if k in model}


def analyze(db: Session, user: User, cls: ClassRoom | None, raw_text: str) -> ModelerSubmission:
    settings = class_settings(cls)
    if user.role == "student" and not settings["ai_enabled"]:
        raise ApiError(403, "AI_DISABLED_FOR_CLASS", "Pemodel AI belum diaktifkan gurumu.")
    text = guard.normalize(raw_text)
    if len(text) > guard.MAX_CHARS:
        raise ApiError(413, "INPUT_TOO_LONG", f"Soal terlalu panjang (maks. {guard.MAX_CHARS} karakter).")
    if len(text) < 20:
        raise ApiError(400, "VALIDATION_ERROR", "Tulis soal ceritanya lengkap dulu.")
    text = guard.mask_pii(text)
    h = guard.text_hash(text)
    sub = ModelerSubmission(user_id=user.id, class_id=cls.id if cls else None, input_text=text, input_hash=h,
                            status="rejected", prompt_version=PROMPT_VERSION)

    if guard.has_blocked_words(text):
        sub.status = "rejected"
        db.add(sub)
        db.commit()
        return sub

    cached = db.scalar(
        select(ModelerSubmission).where(
            ModelerSubmission.input_hash == h, ModelerSubmission.status.in_(["verified", "verified_special"])
        ).order_by(ModelerSubmission.created_at.desc())
    )
    if cached:
        sub.status, sub.model_json, sub.verification_json = cached.status, cached.model_json, cached.verification_json
        sub.cached, sub.llm_model = True, cached.llm_model
        db.add(sub)
        db.commit()
        return sub

    if user.role == "student" and used_today(db, user.id) >= settings["daily_quota"]:
        raise ApiError(429, "QUOTA_EXCEEDED", "Kuota pemodel hari ini sudah habis. Coba lagi besok.")
    if month_cost(db) >= get_settings().modeler_monthly_budget_usd:
        raise ApiError(503, "MODELER_BUDGET_PAUSED", "Pemodel AI dijeda sementara karena batas anggaran bulan ini.")

    def run(content: str) -> LlmResult:
        try:
            return call_model(content)
        except ModelerUnavailable as exc:
            raise ApiError(503, "MODELER_UNAVAILABLE",
                           "Pemodel AI belum aktif di server ini (kunci API belum diisi atau tidak valid).") from exc
        except ModelerBusy as exc:
            raise ApiError(429, "MODELER_BUSY", "Pemodel sedang sibuk, coba lagi sebentar.") from exc

    result = run(user_message(text))
    sub.llm_model, sub.input_tokens, sub.output_tokens = result.model_id, result.input_tokens, result.output_tokens
    sub.latency_ms = result.latency_ms
    if result.refused or result.model is None:
        sub.status = "rejected"
    else:
        sub.status, model, ver = _evaluate(result.model, text)
        if sub.status == "unverified" and model.is_spldv:
            second = run(repair_message(text, ver.problems))
            sub.repaired = True
            sub.input_tokens += second.input_tokens
            sub.output_tokens += second.output_tokens
            sub.latency_ms += second.latency_ms
            if second.model is not None:
                sub.status, model, ver = _evaluate(second.model, text)
        sub.model_json = model.model_dump()
        sub.verification_json = ver.__dict__ if ver else None
    db.add(sub)
    db.commit()
    return sub


def _evaluate(model: WordProblemModel, text: str):
    if not model.language_ok:
        return "rejected", model, None
    if not model.is_spldv:
        return "not_spldv", model, None
    ver = verify(model, text)
    if not ver.ok:
        return "unverified", model, ver
    return ("verified_special" if ver.special else "verified"), model, ver


def problem_from_submission(sub: ModelerSubmission, method: str, mode: str) -> dict:
    m, ver = sub.model_json, sub.verification_json
    variables = {v["symbol"]: {"meaning": v["meaning"], "unit": v["unit"]} for v in m["variables"]}
    story = {
        "segments": [{"id": "a", "text": sub.input_text, "tag": ""}],
        "variables": variables,
        "equation_sources": [e["source_text"] for e in m["equations"]],
        "target": m["target"],
        "target_label": m["target_label"],
        "target_unit": m["target_unit"],
    }
    return build_problem(
        pid=f"ai-{sub.id}", system=ver["system"], method=method,
        mode="worked" if mode == "worked" else "independent",
        title="Soal dari Pemodel", source="ai", story=story,
        literacy={"level": "L1", "context_category": m.get("context_category", "lainnya"),
                  "representation": "text", "akm_cognitive": "penerapan", "item_format": "isian"},
    )
