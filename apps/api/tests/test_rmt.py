"""Rigorous Mathematical Thinking (docs/15): cognitive-function tags and the logical-evidence step."""

import pytest

from app.content import load_content
from app.services.progress import COGNITIVE_FUNCTIONS
from app.services.step_builder import build_problem

SYSTEM = ["x - y = 1", "2*x + 3*y = 12"]


@pytest.mark.parametrize("method", ["substitution", "elimination", "mixed", "graph"])
def test_every_method_ends_with_logical_evidence(method):
    last = build_problem(pid="t", system=SYSTEM, method=method)["steps"][-1]
    assert last["cognitive_function"] == "logical_evidence" and last["check"] == "value"
    assert last["expected"] == "12" and last["instruction"].startswith("Bukti logis") and len(last["hints"]) == 3


def test_fading_keeps_proof_step_open():
    p = build_problem(pid="t", system=SYSTEM, method="substitution", mode="completion", completion_blanks=2)
    open_steps = [s for s in p["steps"] if not s["prefilled"]]
    assert len(open_steps) == 3 and open_steps[-1]["cognitive_function"] == "logical_evidence"
    worked = build_problem(pid="t", system=SYSTEM, method="substitution", mode="worked")
    assert all(s["prefilled"] for s in worked["steps"])


def test_story_problems_keep_their_story_check():
    story = {
        "variables": {"x": {"meaning": "harga 1 buku", "unit": "rupiah"}, "y": {"meaning": "harga 1 pensil", "unit": "rupiah"}},
        "equation_sources": ["2 buku dan 3 pensil", "1 buku dan 2 pensil"],
    }
    p = build_problem(pid="t", system=["2*x + 3*y = 19000", "x + 2*y = 11000"], method="elimination", story=story)
    assert sum(s["cognitive_function"] == "logical_evidence" for s in p["steps"]) == 1
    assert p["steps"][-1]["modeling_stage"] == 6
    assert next(s for s in p["steps"] if s["check"] == "define_variables")["cognitive_function"] == "labeling"


def test_every_content_step_trains_a_known_function():
    content = load_content()
    for p in content["problems"].values():
        for s in p["steps"]:
            assert s["cognitive_function"] in COGNITIVE_FUNCTIONS, (p["id"], s["id"])
    for m in content["modules"].values():
        for sc in m["screens"]:
            assert sc.get("cognitive_function", "labeling") in COGNITIVE_FUNCTIONS, m["id"]
