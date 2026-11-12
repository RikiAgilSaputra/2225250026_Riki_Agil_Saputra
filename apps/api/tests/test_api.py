"""End-to-end API flows: login, learning, guided solving, points, permissions."""

from tests.conftest import login


def test_login_wrong_password(client):
    r = client.post("/api/v1/auth/login", json={"username": "siswa", "password": "salah"})
    assert r.status_code == 401
    assert r.json()["error"]["message"] == "Username atau password salah."


def test_dashboard(client, student):
    d = client.get("/api/v1/dashboard", headers=student).json()
    assert d["name"] == "Nadia"
    assert d["daily_goal"]["target"] == 20 and len(d["daily_goal"]["week"]) == 7
    assert d["streak"] >= 2
    assert d["board"] and any(r["me"] for r in d["board"])
    assert {s["method"] for s in d["skills"]} == {"graph", "substitution", "elimination", "mixed"}


def test_learning_path_covers_every_module_once(client, student):
    lp = client.get("/api/v1/learning-path", headers=student).json()
    ids = [m["id"] for s in lp["stages"] for m in s["modules"]]
    all_ids = [m["id"] for m in client.get("/api/v1/modules", headers=student).json()["items"]]
    assert sorted(ids) == sorted(all_ids) and len(ids) == len(set(ids))
    assert [s["id"] for s in lp["stages"]][0] == "prasyarat"
    assert lp["next_module_id"] in ids
    assert any(s["show_cycle"] for s in lp["stages"])


def test_module_and_progress(client, student):
    m = client.get("/api/v1/modules/SPL-4", headers=student).json()
    assert m["method_card"]["name"] == "Substitusi" and len(m["screens"]) == 4
    assert client.put("/api/v1/progress/SPL-4", json={"last_screen": 2, "seconds": 60}, headers=student).json()["ok"]


def test_guided_attempt_with_feedback_hints_and_points(client, student):
    a = client.post("/api/v1/attempts", json={"problem_id": "SPL-4-i1"}, headers=student).json()
    aid, steps = a["attempt_id"], a["problem"]["steps"]
    assert all("display" not in s for s in steps)  # no answers leak
    s1 = steps[0]["id"]
    wrong = client.post(f"/api/v1/attempts/{aid}/steps", json={"step_id": s1, "answer": "y = 1 + x"}, headers=student).json()
    assert wrong["correct"] is False and wrong["feedback"]
    h = client.post(f"/api/v1/attempts/{aid}/steps/{s1}/hint", headers=student).json()
    assert h["level"] == 1 and len(h["hints"]) == 1
    ok = client.post(f"/api/v1/attempts/{aid}/steps", json={"step_id": s1, "answer": "y = x - 1"}, headers=student).json()
    assert ok["correct"] and ok["points"] == 10
    answers = {"s2": "2x + 3(x - 1) = 12", "s3": "x = 3", "s4": "y = 2"}
    last = None
    for sid, ans in answers.items():
        last = client.post(f"/api/v1/attempts/{aid}/steps", json={"step_id": sid, "answer": ans}, headers=student).json()
        assert last["correct"], (sid, last)
    assert last["completed"] and last["score"] == 100 and last["bonus"] == 20


def test_choose_method_rebuilds_steps(client, student):
    a = client.post("/api/v1/attempts", json={"problem_id": "SPL-4-i1", "method": "elimination"}, headers=student).json()
    assert a["problem"]["method"] == "elimination"


def test_story_problem_has_modeling_cycle(client, student):
    a = client.post("/api/v1/attempts", json={"problem_id": "LIT-1-buku"}, headers=student).json()
    stages = [s.get("modeling_stage") for s in a["problem"]["steps"]]
    assert stages[0] == 1 and 2 in stages and 3 in stages and 5 in stages and 6 in stages
    assert all("tag" not in seg for seg in a["problem"]["story"]["segments"])  # highlight key hidden


def test_generated_problem(client, student):
    a = client.post("/api/v1/attempts", json={"template": "elimination"}, headers=student)
    assert a.status_code == 201 and a.json()["problem"]["source"] == "generated"


def test_other_students_attempt_is_hidden(client, student):
    a = client.post("/api/v1/attempts", json={"problem_id": "PRE-1-p1"}, headers=student).json()
    other = login(client, "demo1", "demo1234")
    assert client.get(f"/api/v1/attempts/{a['attempt_id']}", headers=other).status_code == 404


def test_student_cannot_open_teacher_pages(client, student):
    assert client.get("/api/v1/teacher/overview", headers=student).status_code == 403


def test_teacher_overview_and_board_toggle(client, teacher, student):
    o = client.get("/api/v1/teacher/overview", headers=teacher).json()
    assert o["class"]["name"] == "Kelas 8A" and any(s["name"] == "Nadia" for s in o["students"])
    cid = o["class"]["id"]
    client.patch(f"/api/v1/teacher/classes/{cid}/settings", json={"leaderboard_enabled": False}, headers=teacher)
    assert client.get("/api/v1/dashboard", headers=student).json()["board"] is None
    client.patch(f"/api/v1/teacher/classes/{cid}/settings", json={"leaderboard_enabled": True}, headers=teacher)


def test_notes_crud(client, student):
    n = client.post("/api/v1/notes", json={"title": "Eliminasi", "body": "hilangkan"}, headers=student).json()
    assert client.patch(f"/api/v1/notes/{n['id']}", json={"title": "E", "body": "x"}, headers=student).json()["title"] == "E"
    assert client.delete(f"/api/v1/notes/{n['id']}", headers=student).json()["ok"]


def test_first_ever_step_for_new_student(client):
    """Regression: first activity of the day is created once even when touched twice in one request."""
    r = client.post("/api/v1/auth/register-student",
                    json={"join_code": "K7Q2MX", "display_name": "Rara", "username": "rara8a", "password": "rahasia"})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    a = client.post("/api/v1/attempts", json={"problem_id": "PRE-1-p1"}, headers=h).json()
    res = client.post(f"/api/v1/attempts/{a['attempt_id']}/steps",
                      json={"step_id": "s1", "answer": "-4", "duration_ms": 5000}, headers=h)
    assert res.status_code == 200 and res.json()["correct"]


def test_register_with_join_code(client):
    r = client.post("/api/v1/auth/register-student",
                    json={"join_code": "K7Q2MX", "display_name": "Bima", "username": "bima8a", "password": "rahasia"})
    assert r.status_code == 201 and r.json()["user"]["class"]["name"] == "Kelas 8A"
    bad = client.post("/api/v1/auth/register-student",
                      json={"join_code": "ZZZZZZ", "display_name": "X", "username": "xx_1", "password": "rahasia"})
    assert bad.json()["error"]["code"] == "INVALID_JOIN_CODE"
