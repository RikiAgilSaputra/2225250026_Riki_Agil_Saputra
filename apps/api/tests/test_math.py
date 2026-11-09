"""Step checker (docs/11 §3, SC-01..SC-11) and step builder self-consistency."""

import random

import pytest

from app.content import load_content
from app.services.generator import generate
from app.services.step_builder import build_problem
from app.services.step_checker import check_step

E = "equation_equivalent"


@pytest.mark.parametrize(
    ("step", "answer", "correct", "code"),
    [
        ({"check": E, "expected": "y = 7 - 2*x"}, "y=7-2x", True, None),  # SC-01
        ({"check": E, "expected": "y = 7 - 2*x"}, "2x + y = 7", True, None),  # SC-02
        ({"check": E, "expected": "y = 7 - 2*x"}, "y = 7 + 2x", False, "SIGN_ERROR"),  # SC-03
        ({"check": E, "expected": "6*x + 3*y = 21"}, "6x + 3y = 7", False, "PARTIAL_MULTIPLY"),  # SC-04
        ({"check": "value", "expected": "3", "variable": "x"}, "x = 3.0", True, None),  # SC-05
        ({"check": "value", "expected": "1/2", "variable": "x"}, "x = 0,5", True, None),  # SC-06
        ({"check": "point", "expected": ["3", "1"]}, "(1, 3)", False, "VAR_SWAP"),  # SC-07
        ({"check": E, "expected": "y = 7 - 2*x"}, "__import__('os')", False, "FORMAT"),  # SC-08
        ({"check": E, "expected": "y = 7 - 2*x"}, "x" * 121, False, "TOO_LONG"),  # SC-09
        ({"check": E, "expected": "y = 7 - 2*x"}, "x**99999999", False, "FORMAT"),  # SC-10
        ({"check": E, "expected": "y = 7 - 2*x"}, "y = 7 − 2x", True, None),  # SC-11
        ({"check": E, "expected": "2*x + 3*y = 19000"}, "2x + 3y = 19.000", True, None),
        ({"check": "equation_scaled", "expected": "4*x + 2*y = 14"}, "2x + y = 7", False, "NOT_SCALED"),
        ({"check": "value", "expected": "3", "variable": "x"}, "y = 3", False, "WRONG_VAR"),
        ({"check": "highlight_spans", "expected": {"a": "known", "b": "asked"}}, {"a": "known", "b": "asked"}, True, None),
    ],
)
def test_check_step(step, answer, correct, code):
    r = check_step(step, answer)
    assert r.correct is correct
    assert r.error_code == code


def _self_check(problem):
    for s in problem["steps"]:
        exp = s["expected"]
        ans = f"({exp[0]}, {exp[1]})" if s["check"] == "point" else exp
        assert check_step(s, ans).correct, (problem["id"], s)


def test_builder_random_systems():
    r = random.Random(7)
    for _ in range(80):
        X, Y = r.randint(-9, 9), r.randint(-9, 9)
        a1, b1, a2, b2 = (r.choice([i for i in range(-6, 7) if i]) for _ in range(4))
        if a1 * b2 - a2 * b1 == 0:
            continue
        system = [f"{a1}*x + {b1}*y = {a1 * X + b1 * Y}", f"{a2}*x + {b2}*y = {a2 * X + b2 * Y}"]
        for method in ("substitution", "elimination", "mixed", "graph"):
            p = build_problem(pid="t", system=system, method=method)
            assert p["solution"] == {"x": str(X), "y": str(Y)}
            _self_check(p)


@pytest.mark.parametrize("template", ["graph", "substitution", "elimination", "mixed", "story"])
def test_generator(template):
    for seed in range(40):
        _self_check(generate(template, seed))


def test_all_content_answer_keys_consistent():
    for p in load_content()["problems"].values():
        _self_check(p)
        for s in p["steps"]:
            assert len(s["hints"]) == 3
