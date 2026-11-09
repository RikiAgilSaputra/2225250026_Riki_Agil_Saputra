"""Safe parsing of student math input.

Only digits, x, y, + - * / ( ) = . , and spaces are accepted. Powers are not
needed for SPLDV and are rejected, so parsing cannot be abused for expensive
computation. Input is whitelisted with a regex *before* SymPy sees it.
"""

import re

from sympy import Expr, Rational, Symbol, nsimplify, sympify
from sympy.parsing.sympy_parser import (
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

x, y = Symbol("x"), Symbol("y")
SYMBOLS = {"x": x, "y": y}
MAX_LEN = 120

_ALLOWED = re.compile(r"^[0-9xy+\-*/().=,\s]*$")
_TRANSFORMS = standard_transformations + (implicit_multiplication_application,)


class ParseError(ValueError):
    pass


def normalize(raw: str) -> str:
    s = raw.strip()
    replacements = {
        "−": "-", "–": "-", "—": "-", "×": "*", "·": "*", "÷": "/", ":": "/",
        "X": "x", "Y": "y", "Rp": "", "rp": "",
    }
    for a, b in replacements.items():
        s = s.replace(a, b)
    # Indonesian thousands separator "19.000" -> 19000 (dot followed by exactly 3 digits)
    s = re.sub(r"(?<=\d)\.(?=\d{3}(?!\d))", "", s)
    return s


def _decimal_commas(s: str) -> str:
    # "1,5" -> "1.5" (comma between digits), used when the input is not a point
    return re.sub(r"(?<=\d),(?=\d)", ".", s)


def parse_expression(raw: str) -> Expr:
    s = _decimal_commas(normalize(raw))
    if len(s) > MAX_LEN:
        raise ParseError("TOO_LONG")
    if not s or not _ALLOWED.match(s) or "=" in s or "," in s:
        raise ParseError("FORMAT")
    try:
        expr = parse_expr(s, local_dict=dict(SYMBOLS), transformations=_TRANSFORMS, evaluate=True)
    except Exception as exc:  # noqa: BLE001 - any parse failure is a format error
        raise ParseError("FORMAT") from exc
    if not isinstance(expr, Expr) or not expr.free_symbols <= {x, y}:
        raise ParseError("FORMAT")
    return nsimplify(expr, rational=True)


def parse_equation(raw: str) -> tuple[Expr, Expr]:
    s = normalize(raw)
    if s.count("=") != 1:
        raise ParseError("FORMAT")
    lhs, rhs = s.split("=")
    return parse_expression(lhs), parse_expression(rhs)


def parse_number(raw: str) -> Rational:
    """Accepts '3', '-2', '7/2', '3,5', 'x = 3' (left side ignored by caller)."""
    s = normalize(raw)
    if "=" in s:
        s = s.split("=")[-1]
    expr = parse_expression(s)
    if expr.free_symbols:
        raise ParseError("FORMAT")
    return sympify(expr)


def parse_point(raw: str) -> tuple[Rational, Rational]:
    s = normalize(raw).strip()
    s = s.strip("()").strip()
    # Points use ";" or "," as separator; allow "3, 1" and "3;1"
    parts = re.split(r"\s*[;,]\s*", s) if ";" in s or ", " in s or s.count(",") == 1 else []
    if len(parts) != 2:
        raise ParseError("FORMAT")
    return parse_number(parts[0]), parse_number(parts[1])


def linear_coeffs(expr: Expr) -> tuple[Rational, Rational, Rational] | None:
    """Return (a, b, c) for a*x + b*y + c, or None if the expression is not linear."""
    expr = expr.expand()
    a, b = expr.coeff(x, 1), expr.coeff(y, 1)
    c = expr.subs({x: 0, y: 0})
    if (a * x + b * y + c - expr).expand() != 0:
        return None
    if a.free_symbols or b.free_symbols or c.free_symbols:
        return None
    return a, b, c


def equation_vector(lhs: Expr, rhs: Expr) -> tuple[Rational, Rational, Rational] | None:
    """Equation lhs = rhs as vector (a, b, c) meaning a*x + b*y + c = 0."""
    return linear_coeffs(lhs - rhs)


def proportional(u, v) -> bool:
    """True if vectors u and v are non-zero scalar multiples of each other."""
    if all(t == 0 for t in u) or all(t == 0 for t in v):
        return False
    k = None
    for a, b in zip(u, v, strict=True):
        if a == 0 and b == 0:
            continue
        if a == 0 or b == 0:
            return False
        r = a / b
        if k is None:
            k = r
        elif r != k:
            return False
    return True


def fmt_number(v) -> str:
    v = nsimplify(v)
    if v.is_Integer:
        n = int(v)
        return f"{n:,}".replace(",", ".") if abs(n) >= 1000 else str(n)
    return f"{v.p}/{v.q}"


def fmt_linear(a, b, c=0, rhs=None) -> str:
    """Pretty print a*x + b*y (+ c) [= rhs] with Unicode minus."""
    parts: list[str] = []
    for coef, var in ((a, "x"), (b, "y")):
        if coef == 0:
            continue
        sign = "−" if coef < 0 else "+"
        mag = abs(coef)
        body = var if mag == 1 else f"{fmt_number(mag)}{var}"
        parts.append(body if not parts and sign == "+" else (f"−{body}" if not parts else f" {sign} {body}"))
    if c != 0 or not parts:
        sign = "−" if c < 0 else "+"
        mag = fmt_number(abs(c))
        parts.append(mag if not parts and sign == "+" else (f"−{mag}" if not parts else f" {sign} {mag}"))
    s = "".join(parts)
    return s if rhs is None else f"{s} = {fmt_number(rhs) if not isinstance(rhs, str) else rhs}"
