"""Checks one step answer and classifies the error (docs/04-LEARNING-DESIGN.md §8)."""

from dataclasses import dataclass

from app.services import mathparse as mp

FEEDBACK = {
    "SIGN_ERROR": "Periksa tanda saat memindahkan suku ke ruas lain.",
    "ARITH_ERROR": "Caramu sudah benar. Periksa lagi hitunganmu.",
    "VAR_SWAP": "Nilai x dan y tertukar. Lihat label warnanya.",
    "PARTIAL_MULTIPLY": "Kalikan semua suku di kedua ruas.",
    "NOT_SCALED": "Kalikan dulu dengan bilangan yang diminta.",
    "WRONG_VAR": "Yang ditanya variabel lain. Baca lagi instruksinya.",
    "FORMAT": "Tulis dalam bentuk seperti: y = 7 − 2x",
    "TOO_LONG": "Jawabanmu terlalu panjang.",
    "MODEL_REVERSED": "Siapa yang lebih besar? Baca lagi kalimatnya.",
    "WRONG_CHOICE": "Belum tepat. Coba baca lagi ceritanya.",
    "SPANS": "Masih ada bagian cerita yang belum tepat ditandai.",
    "UNKNOWN": "Belum tepat. Coba lihat petunjuk.",
}


@dataclass
class CheckResult:
    correct: bool
    error_code: str | None = None

    @property
    def feedback(self) -> str:
        return "Benar!" if self.correct else FEEDBACK.get(self.error_code or "UNKNOWN", FEEDBACK["UNKNOWN"])


def _classify_equation(ans_l, ans_r, exp_l, exp_r) -> str:
    ans = mp.equation_vector(ans_l, ans_r)
    exp = mp.equation_vector(exp_l, exp_r)
    if ans is None or exp is None:
        return "UNKNOWN"
    # Sign error: flipping the sign of exactly one term makes it right
    for i in range(3):
        flipped = list(ans)
        flipped[i] = -flipped[i]
        if flipped[i] != 0 and mp.proportional(flipped, exp):
            return "SIGN_ERROR"
    # Variables swapped
    if mp.proportional((ans[1], ans[0], ans[2]), exp):
        return "VAR_SWAP"
    # Multiplied only one side: compare sides separately
    al, ar = mp.linear_coeffs(ans_l), mp.linear_coeffs(ans_r)
    el, er = mp.linear_coeffs(exp_l), mp.linear_coeffs(exp_r)
    if None not in (al, ar, el, er):
        if (al == el and ar != er) or (ar == er and al != el):
            if mp.proportional(al, el) and mp.proportional(ar, er):
                return "PARTIAL_MULTIPLY"
    # Right structure (same x/y ratio), wrong constant
    if (ans[0], ans[1]) != (0, 0) and mp.proportional((ans[0], ans[1]), (exp[0], exp[1])):
        return "ARITH_ERROR"
    return "UNKNOWN"


def check_step(step: dict, answer) -> CheckResult:
    kind = step["check"]
    expected = step.get("expected")
    if isinstance(answer, str) and len(answer) > mp.MAX_LEN:
        return CheckResult(False, "TOO_LONG")
    try:
        if kind == "equation_scaled":
            # The equation must be multiplied exactly as instructed (k = ±1 only).
            if not isinstance(answer, str):
                return CheckResult(False, "FORMAT")
            al, ar = mp.parse_equation(answer)
            el, er = mp.parse_equation(expected)
            av, ev = mp.equation_vector(al, ar), mp.equation_vector(el, er)
            if av is None:
                return CheckResult(False, "UNKNOWN")
            if tuple(av) == tuple(ev) or tuple(-t for t in av) == tuple(ev):
                return CheckResult(True)
            if mp.proportional(av, ev):
                return CheckResult(False, "NOT_SCALED")
            return CheckResult(False, _classify_equation(al, ar, el, er))

        if kind in ("equation_equivalent", "expression_equivalent"):
            if not isinstance(answer, str):
                return CheckResult(False, "FORMAT")
            if kind == "expression_equivalent":
                a, e = mp.parse_expression(answer), mp.parse_expression(expected)
                return CheckResult((a - e).expand() == 0, None if (a - e).expand() == 0 else "UNKNOWN")
            al, ar = mp.parse_equation(answer)
            el, er = mp.parse_equation(expected)
            av, ev = mp.equation_vector(al, ar), mp.equation_vector(el, er)
            if av is None:
                return CheckResult(False, "UNKNOWN")
            if mp.proportional(av, ev):
                return CheckResult(True)
            return CheckResult(False, _classify_equation(al, ar, el, er))

        if kind == "value":
            if not isinstance(answer, str):
                return CheckResult(False, "FORMAT")
            var = step.get("variable")
            norm = mp.normalize(answer)
            if "=" in norm and var:
                left = norm.split("=")[0].strip()
                if left in ("x", "y") and left != var:
                    return CheckResult(False, "WRONG_VAR")
            value = mp.parse_number(answer)
            target = mp.parse_number(str(expected))
            if value == target:
                return CheckResult(True)
            other = step.get("other_value")
            if other is not None and value == mp.parse_number(str(other)):
                return CheckResult(False, "VAR_SWAP")
            if value == -target:
                return CheckResult(False, "SIGN_ERROR")
            return CheckResult(False, "ARITH_ERROR")

        if kind == "point":
            if not isinstance(answer, str):
                return CheckResult(False, "FORMAT")
            px, py = mp.parse_point(answer)
            ex, ey = (mp.parse_number(str(v)) for v in expected)
            if (px, py) == (ex, ey):
                return CheckResult(True)
            if (px, py) == (ey, ex):
                return CheckResult(False, "VAR_SWAP")
            return CheckResult(False, "UNKNOWN")

        if kind in ("choice", "define_variables", "interpret", "reasonableness"):
            ok = str(answer) == str(expected)
            return CheckResult(ok, None if ok else step.get("wrong_code", "WRONG_CHOICE"))

        if kind == "highlight_spans":
            # expected: {segment_id: tag}; tags: known | asked | irrelevant. Untagged = "".
            if not isinstance(answer, dict):
                return CheckResult(False, "FORMAT")
            ok = all(answer.get(seg, "") == tag for seg, tag in expected.items())
            return CheckResult(ok, None if ok else "SPANS")
    except mp.ParseError as exc:
        return CheckResult(False, str(exc) if str(exc) in FEEDBACK else "FORMAT")

    raise ValueError(f"Unknown check type: {kind}")
