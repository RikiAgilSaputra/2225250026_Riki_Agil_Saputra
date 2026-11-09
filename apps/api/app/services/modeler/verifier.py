"""Deterministic verification of an AI model with SymPy (docs/14 §6, checks V1–V7).

The AI only translates; nothing it computes is trusted. A model is used only if
it passes every mandatory check.
"""

import difflib
import re
from dataclasses import dataclass, field
from fractions import Fraction

from app.services import mathparse as mp
from app.services.modeler.number_parser import extract_numbers
from app.services.modeler.schema import WordProblemModel
from app.services.step_builder import parse_system, solve_system

# General knowledge the model may use without the number appearing in the text (V3)
KNOWLEDGE = {Fraction(n) for n in (0, 1, 2, 3, 4, 10, 12, 100)}


@dataclass
class Verification:
    ok: bool
    special: bool = False  # V5: no unique solution
    problems: list[str] = field(default_factory=list)
    solution: dict | None = None
    target_value: str | None = None
    system: list[str] | None = None
    checks: dict = field(default_factory=dict)


def _norm(s: str) -> str:
    s = s.lower().replace("−", "-")
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def source_found(source: str, text: str) -> bool:
    src, txt = _norm(source), _norm(text)
    if not src:
        return False
    if src in txt:
        return True
    words, n = txt.split(), len(src.split())
    best = 0.0
    for i in range(max(1, len(words) - n + 1)):
        window = " ".join(words[i : i + n])
        best = max(best, difflib.SequenceMatcher(None, src, window).ratio())
    return best >= 0.9


def _constants(eq: str) -> set[Fraction]:
    lhs, rhs = mp.parse_equation(eq)
    out = set()
    for side in (lhs, rhs):
        a, b, c = mp.linear_coeffs(side) or (0, 0, 0)
        for v in (a, b, c):
            if v != 0:
                out.add(abs(Fraction(int(v.p), int(v.q))))
    # Constants inside brackets like (x + 5) are also checked
    for tok in re.findall(r"\d+(?:\.\d+)?", eq):
        out.add(Fraction(tok))
    return out


def _allowed_numbers(text: str) -> set[Fraction]:
    base = extract_numbers(text) | KNOWLEDGE
    derived = set(base)
    for a in base:
        for b in base:
            derived.add(a * b)
            derived.add(a + b)
            if a > b:
                derived.add(a - b)
            if b != 0:
                derived.add(a / b)
    return derived


def verify(model: WordProblemModel, text: str) -> Verification:
    v = Verification(ok=False)
    # V1: exactly two variables x, y and two parseable equations
    symbols = sorted(var.symbol for var in model.variables)
    if symbols != ["x", "y"] or len(model.equations) != 2:
        v.problems.append("Harus ada tepat dua variabel (x dan y) dan dua persamaan.")
        return v
    try:
        eqs = parse_system([e.equation for e in model.equations])
        v.checks["V1"] = True
    except (mp.ParseError, ValueError):
        v.problems.append("Persamaan tidak dapat dibaca atau tidak linear; tulis dengan * eksplisit.")
        v.checks["V1"] = False
        return v
    v.checks["V2"] = True  # parse_system rejects non-linear equations
    # V3: number trace
    allowed = _allowed_numbers(text)
    stray = set()
    for e in model.equations:
        stray |= {c for c in _constants(e.equation) if c not in allowed}
    v.checks["V3"] = not stray
    if stray:
        v.problems.append(
            "Ada angka yang tidak berasal dari soal: " + ", ".join(str(s) for s in sorted(stray)) + "."
        )
    # V4: each source quote really appears in the text
    missing = [e.source_text for e in model.equations if not source_found(e.source_text, text)]
    v.checks["V4"] = not missing
    if missing:
        v.problems.append("Kutipan sumber tidak ditemukan persis di soal: " + " | ".join(missing))
    # V7: target is an expression of x, y
    try:
        target = mp.parse_expression(model.target)
        v.checks["V7"] = True
    except mp.ParseError:
        target = None
        v.checks["V7"] = False
        v.problems.append("target harus berupa ekspresi dalam x dan y.")
    v.system = [f"({a})*x + ({b})*y = {c}" for a, b, c in eqs]
    # V5: unique solution
    sol = solve_system(eqs)
    if sol is None:
        v.special = True
        v.checks["V5"] = False
        v.ok = not v.problems
        return v
    v.checks["V5"] = True
    v.solution = {"x": str(sol["x"]), "y": str(sol["y"])}
    # V6: plausibility
    implausible = []
    for var in model.variables:
        val = sol[var.symbol]
        if var.must_be_positive and val <= 0:
            implausible.append(f"{var.meaning} = {val} (harus positif)")
        if var.must_be_integer and not val.is_integer:
            implausible.append(f"{var.meaning} = {val} (harus bilangan bulat)")
    v.checks["V6"] = not implausible
    if implausible:
        v.problems.append("Hasil tidak masuk akal: " + "; ".join(implausible) + ".")
    if target is not None:
        v.target_value = str(target.subs({mp.x: sol["x"], mp.y: sol["y"]}))
    v.ok = not v.problems
    return v
