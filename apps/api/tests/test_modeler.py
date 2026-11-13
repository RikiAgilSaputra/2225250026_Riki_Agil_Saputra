"""Modeler verifier and pipeline without calling the real API (docs/11 §3a, MV-01..MV-12)."""

import pytest

from app.services.modeler import guard, llm_client, service
from app.services.modeler.llm_client import LlmResult
from app.services.modeler.number_parser import extract_numbers
from app.services.modeler.schema import WordProblemModel
from app.services.modeler.verifier import verify
from tests.conftest import login

TEXT = "Harga 2 buku dan 3 pensil Rp19.000. Harga 1 buku dan 2 pensil Rp11.000. Berapa harga 1 buku?"
KAKI = "Di kandang ada ayam dan kambing sebanyak 30 ekor. Jumlah kakinya 80. Berapa banyak kambing?"


def make_model(equations, sources=None, variables=None, target="x", **kw) -> WordProblemModel:
    variables = variables or [
        {"symbol": "x", "meaning": "harga 1 buku", "unit": "rupiah", "must_be_positive": True, "must_be_integer": False},
        {"symbol": "y", "meaning": "harga 1 pensil", "unit": "rupiah", "must_be_positive": True, "must_be_integer": False},
    ]
    sources = sources or ["Harga 2 buku dan 3 pensil Rp19.000", "Harga 1 buku dan 2 pensil Rp11.000"]
    data = {
        "is_spldv": True, "not_spldv_reason": None, "language_ok": True, "context_category": "personal",
        "known_facts": sources, "irrelevant_facts": [], "question_text": "Berapa harga 1 buku?",
        "variables": variables,
        "equations": [{"source_text": s, "math_sentence": "-", "equation": e} for s, e in zip(sources, equations, strict=True)],
        "target": target, "target_label": "harga 1 buku", "target_unit": "rupiah",
    }
    data.update(kw)
    return WordProblemModel.model_validate(data)


def test_mv01_verified():
    v = verify(make_model(["2*x + 3*y = 19000", "x + 2*y = 11000"]), TEXT)
    assert v.ok and v.solution == {"x": "5000", "y": "3000"} and v.target_value == "5000"


def test_mv02_nonlinear():
    assert not verify(make_model(["x*y = 19000", "x + 2*y = 11000"]), TEXT).ok


def test_mv03_number_trace():
    v = verify(make_model(["2*x + 3*y = 21000", "x + 2*y = 11000"]), TEXT)
    assert not v.ok and v.checks["V3"] is False


def test_mv04_source_not_found():
    v = verify(make_model(["2*x + 3*y = 19000", "x + 2*y = 11000"],
                          sources=["Harga 2 buku dan 3 pensil Rp19.000", "Ani membeli banyak permen"]), TEXT)
    assert not v.ok and v.checks["V4"] is False


def test_mv05_must_be_integer():
    variables = [
        {"symbol": "x", "meaning": "banyak ayam", "unit": "ekor", "must_be_positive": True, "must_be_integer": True},
        {"symbol": "y", "meaning": "banyak kambing", "unit": "ekor", "must_be_positive": True, "must_be_integer": True},
    ]
    text = "Ada ayam dan kambing sebanyak 30 ekor. Jumlah kakinya 81. Berapa banyak kambing?"
    v = verify(make_model(["x + y = 30", "2*x + 4*y = 81"], sources=["ayam dan kambing sebanyak 30 ekor", "Jumlah kakinya 81"],
                          variables=variables, target="y"), text)
    assert not v.ok and v.checks["V6"] is False


def test_mv06_parallel_is_special():
    text = "Harga 1 buku dan 1 pensil Rp5.000. Harga 2 buku dan 2 pensil Rp10.000."
    v = verify(make_model(["x + y = 5000", "2*x + 2*y = 10000"],
                          sources=["Harga 1 buku dan 1 pensil Rp5.000", "Harga 2 buku dan 2 pensil Rp10.000"]), text)
    assert v.special


def test_mv07_number_words():
    assert 19000 in extract_numbers("seharga 19 ribu")
    assert 20 in extract_numbers("dua puluh ekor")
    assert 12 in extract_numbers("selusin")


def test_mv08_knowledge_whitelist():
    variables = [
        {"symbol": "x", "meaning": "banyak ayam", "unit": "ekor", "must_be_positive": True, "must_be_integer": True},
        {"symbol": "y", "meaning": "banyak kambing", "unit": "ekor", "must_be_positive": True, "must_be_integer": True},
    ]
    v = verify(make_model(["x + y = 30", "2*x + 4*y = 80"], sources=["ayam dan kambing sebanyak 30 ekor", "Jumlah kakinya 80"],
                          variables=variables, target="y"), KAKI)
    assert v.ok and v.target_value == "10"


def test_mv10_pii_masked():
    assert "[nomor HP]" in guard.mask_pii("hubungi 081234567890 ya")


@pytest.fixture
def fake_llm(monkeypatch):
    calls = []

    def fake(content):
        calls.append(content)
        model = make_model(["2*x + 3*y = 19000", "x + 2*y = 11000"])
        return LlmResult(model=model, refused=False, input_tokens=1000, output_tokens=500, latency_ms=10, model_id="mock")

    monkeypatch.setattr(service, "call_model", fake)
    return calls


def test_analyze_without_key_returns_503(client, student):
    r = client.post("/api/v1/modeler/analyze", json={"text": TEXT + " (tanpa kunci)"}, headers=student)
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "MODELER_UNAVAILABLE"
    assert llm_client.get_settings().gemini_api_key == ""


def test_analyze_verified_then_cached_then_attempt(client, student, fake_llm):
    r = client.post("/api/v1/modeler/analyze", json={"text": TEXT}, headers=student)
    body = r.json()
    assert r.status_code == 200 and body["status"] == "verified", body
    assert "solution" not in str(body)  # answers are not sent with the model
    # MV-12: same text again → cache hit, no new LLM call
    r2 = client.post("/api/v1/modeler/analyze", json={"text": TEXT}, headers=student).json()
    assert r2["cached"] is True and len(fake_llm) == 1
    # Guided attempt built from the verified model
    a = client.post("/api/v1/attempts", json={"submission_id": body["submission_id"], "mode": "guided"}, headers=student)
    assert a.status_code == 201, a.text
    steps = a.json()["problem"]["steps"]
    assert steps[0]["check"] == "define_variables"
    assert all("expected" not in s for s in steps)


def test_mv11_quota(client, teacher, student, fake_llm):
    cls = client.get("/api/v1/teacher/overview", headers=teacher).json()["class"]
    client.patch(f"/api/v1/teacher/classes/{cls['id']}/settings", json={"daily_quota": 0}, headers=teacher)
    r = client.post("/api/v1/modeler/analyze", json={"text": "Harga 3 apel dan 2 jeruk Rp16.000. Harga 1 apel dan 1 jeruk Rp6.000."},
                    headers=student)
    assert r.status_code == 429 and r.json()["error"]["code"] == "QUOTA_EXCEEDED"
    client.patch(f"/api/v1/teacher/classes/{cls['id']}/settings", json={"daily_quota": 10}, headers=teacher)


def test_ai_disabled_for_class(client, teacher):
    cls = client.get("/api/v1/teacher/overview", headers=teacher).json()["class"]
    client.patch(f"/api/v1/teacher/classes/{cls['id']}/settings", json={"ai_enabled": False}, headers=teacher)
    r = client.post("/api/v1/modeler/analyze", json={"text": TEXT}, headers=login(client))
    assert r.status_code == 403
    client.patch(f"/api/v1/teacher/classes/{cls['id']}/settings", json={"ai_enabled": True}, headers=teacher)


# ------------------------------------------------------------------ Gemini adapter (no network)
def test_gemini_schema_is_flat_and_nullable_as_type_array():
    s = llm_client.gemini_schema()
    text = str(s)
    assert "$ref" not in text and "$defs" not in text and "anyOf" not in text
    assert s["properties"]["not_spldv_reason"]["type"] == ["string", "null"]
    assert s["properties"]["variables"]["items"]["properties"]["symbol"]["enum"] == ["x", "y"]
    assert s["additionalProperties"] is False


def test_gemini_result_mapping():
    import json as _json
    model = make_model(["2*x + 3*y = 19000", "x + 2*y = 11000"])
    usage = {"total_input_tokens": 900, "total_output_tokens": 200, "total_thought_tokens": 50}
    ok = llm_client.from_interaction({"status": "completed", "output_text": _json.dumps(model.model_dump()), "usage": usage}, 12, "m")
    assert ok.model == model and not ok.refused and ok.input_tokens == 900 and ok.output_tokens == 250
    assert llm_client.from_interaction({"status": "failed", "usage": usage}, 5, "m").refused
    assert llm_client.from_interaction({"status": "completed", "output_text": "{bad"}, 5, "m").model is None
    assert llm_client.model_order("a", "b") == ["a", "b"] and llm_client.model_order("a", "") == ["a"]


def test_placeholder_key_counts_as_not_set():
    from app.core.config import Settings
    assert Settings(gemini_api_key="TEMPEL_API_KEY_AQ_ANDA_DI_SINI").gemini_api_key == ""
    assert Settings(gemini_api_key=' "AQ.contoh-kunci" ').gemini_api_key == "AQ.contoh-kunci"
