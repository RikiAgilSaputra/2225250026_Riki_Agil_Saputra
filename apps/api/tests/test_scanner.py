"""Problem scanner (docs/14 §12): story vs. equations vs. other; photo reading is mocked."""

import pytest

from app.services.modeler import service
from app.services.modeler.ocr import OcrResult
from app.services.scanner import find_equations, scan_text
from app.services.step_builder import build_problem

PHOTO = {"data": "A" * 400, "mime_type": "image/jpeg"}


@pytest.mark.parametrize("text", [
    "Harga 2 buku dan 3 pensil Rp19.000. Harga 1 buku dan 2 pensil Rp11.000. Berapa harga 1 buku?",
    "Di kandang ada ayam dan kambing sebanyak tiga puluh ekor. Jumlah kakinya delapan puluh. Berapa banyak kambing?",
])
def test_story(text):
    assert scan_text(text).kind == "story"


@pytest.mark.parametrize("text", [
    "2x + y = 7\nx − y = 2",
    "Tentukan penyelesaian dari 2x + y = 7 dan x - y = 2.",
    "(1) 2x + 3y = 12\n(2) x - y = 1",
    "1. 4x + 2y = 14; 2. x + y = 4",
    "{ 2x + y = 7, x − y = 2 }",
])
def test_equations_solvable(text):
    r = scan_text(text)
    assert r.kind == "equations" and r.solvable and len(r.system) == 2
    assert len(build_problem(pid="scan-t", system=r.system, method="mixed", source="scan")["steps"]) > 2


def test_special_cases():
    assert scan_text("x + y = 5\n2x + 2y = 7").solvable is False
    assert scan_text("2x + 5 = 11").kind == "other"
    assert scan_text("x + y = 5\nx - y = 1\n2x + y = 8").kind == "other"
    assert scan_text("").kind == "other"
    assert len(find_equations("Persamaan (1): 2x + y = 7. Persamaan (2): 2x + y = 7")) == 1
    assert scan_text("2x + y = 7\nx − y = 2").equations == ["2x + y = 7", "x − y = 2"]


def test_scan_text_and_start_attempt(client, student):
    r = client.post("/api/v1/modeler/scan", json={"text": "2x + y = 7\nx − y = 2"}, headers=student).json()
    assert r["kind"] == "equations" and r["solvable"]
    a = client.post("/api/v1/attempts", json={"system": r["system"], "method": "elimination"}, headers=student)
    assert a.status_code == 201, a.text
    assert a.json()["problem"]["source"] == "scan"
    # Full solution from the first step to the logical proof, all shown
    w = client.post("/api/v1/attempts", json={"system": r["system"], "method": "substitution", "mode": "worked"}, headers=student)
    assert w.status_code == 201, w.text
    wp = w.json()["problem"]
    assert wp["mode"] == "worked" and all(s["prefilled"] for s in wp["steps"])
    assert wp["steps"][-1]["cognitive_function"] == "logical_evidence"
    bad = client.post("/api/v1/attempts", json={"system": ["x + y = 5", "2x + 2y = 7"]}, headers=student)
    assert bad.status_code == 400
    assert client.post("/api/v1/modeler/scan", json={}, headers=student).status_code == 422


def test_scan_photo_masked_and_counted(client, student, monkeypatch):
    calls = []

    def fake(data, mime):
        calls.append(mime)
        return OcrResult(readable=True, text="Andi (081234567890) membeli 3 buku dan 2 pulpen Rp21.000.\n"
                         "Dimas membeli 2 buku dan 4 pulpen Rp22.000.\nBerapa harga 1 buku?",
                         refused=False, input_tokens=1500, output_tokens=80, latency_ms=20, model_id="mock")

    monkeypatch.setattr(service, "read_photo", fake)
    before = client.get("/api/v1/modeler/quota", headers=student).json()["remaining"]
    r = client.post("/api/v1/modeler/scan", json={"image": PHOTO}, headers=student)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == "image" and body["kind"] == "story"
    assert "[nomor HP]" in body["text"] and "0812" not in body["text"] and "\n" in body["text"]
    assert calls == ["image/jpeg"] and body["quota_remaining"] == before - 1


def test_scan_photo_unreadable_and_invalid(client, student, monkeypatch):
    monkeypatch.setattr(service, "read_photo", lambda d, m: OcrResult(False, "", False, 10, 2, 5, "mock"))
    r = client.post("/api/v1/modeler/scan", json={"image": PHOTO}, headers=student).json()
    assert r["kind"] == "other" and r["message"].startswith("Foto belum terbaca jelas")
    gif = client.post("/api/v1/modeler/scan", json={"image": {**PHOTO, "mime_type": "image/gif"}}, headers=student)
    assert gif.status_code == 422
