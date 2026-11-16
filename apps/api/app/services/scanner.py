"""Problem scanner: decides, without AI, what kind of problem a text is (docs/14 §12).

Port of supabase/functions/api/services/scanner.ts (keep both in sync):
  story     → a word problem: goes to the AI modeler (translation only)
  equations → an SPLDV already written as two linear equations: solved step by step directly
  other     → not an SPLDV (one equation, three or more equations, no math)
"""

import re
from dataclasses import dataclass, field

from app.services import mathparse as mp
from app.services.step_builder import eq_str, parse_system, pretty, solve_system

SCAN_MESSAGES = {
    "story": "Soal cerita terdeteksi. Periksa teksnya, lalu buat model matematikanya.",
    "equations": "Soal SPLDV berbentuk persamaan terdeteksi. Bisa langsung dikerjakan langkah demi langkah.",
    "no_unique_solution": "Kedua persamaan sejajar atau berimpit, jadi tidak ada penyelesaian tunggal.",
    "one_equation": "Hanya ada satu persamaan. SPLDV memerlukan dua persamaan.",
    "too_many": "Ada lebih dari dua persamaan. SPLDV memakai tepat dua persamaan.",
    "other": "Teks ini belum terlihat seperti soal SPLDV. Periksa lagi teksnya.",
}

_MATH_RUN = re.compile(r"[0-9xyXY+\-−–—*/×·:().,\s]*=[0-9xyXY+\-−–—*/×·:().,\s]*")
_LABEL = re.compile(r"^\s*(\(\s*(?:\d+|[ivx]+)\s*\)|(?:\d+|[ivx]+)[.)](?=\s))\s*", re.IGNORECASE)
_LEADING_LABEL = re.compile(r"^\(?\s*(?:\d+|[ivx]+)\s*(?:\)\s*:?|:|\.(?!\d))\s*", re.IGNORECASE)
_NUMBER_WORDS = re.compile(
    r"\b(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|puluh|belas|ratus|ribu|juta|"
    r"setengah|selusin|lusin)\b", re.IGNORECASE)


@dataclass
class ScanResult:
    kind: str  # story | equations | other
    solvable: bool
    message: str
    system: list[str] | None = None
    equations: list[str] | None = field(default=None)


def find_equations(text: str) -> list[tuple[str, str]]:
    """Linear equations in x/y found in the text: [(machine form, display form)], in order, no duplicates."""
    pieces = [p2 for p in re.split(r"\r?\n|;|[{}|]|\s+dan\s+", text, flags=re.IGNORECASE)
              for p2 in re.split(r",\s+(?=[^,]*=)", p)]
    found: list[tuple[str, str]] = []
    seen: set[str] = set()
    for piece in pieces:
        piece = _LABEL.sub("", piece, count=1)
        for m in _MATH_RUN.findall(piece):
            candidate = re.sub(r"[.,]+$", "", _LEADING_LABEL.sub("", m.strip(), count=1))
            if not re.search(r"[xyXY]", candidate) or candidate.count("=") != 1:
                continue
            try:
                lhs, rhs = mp.parse_equation(candidate)
                vec = mp.equation_vector(lhs, rhs)
                if vec is None or (vec[0] == 0 and vec[1] == 0):
                    continue
                eq = parse_system([candidate])[0]
            except (mp.ParseError, ValueError, ZeroDivisionError):
                continue
            key = eq_str(*eq)
            if key in seen:
                continue
            seen.add(key)
            found.append((key, pretty(*eq)))
    return found


def scan_text(raw: str) -> ScanResult:
    text = re.sub(r"[ \t]+", " ", raw).strip()
    eqs = find_equations(text)
    if len(eqs) >= 3:
        return ScanResult("other", False, SCAN_MESSAGES["too_many"])
    if len(eqs) == 2:
        system = [e[0] for e in eqs]
        solvable = solve_system(parse_system(system)) is not None
        return ScanResult("equations", solvable, SCAN_MESSAGES["equations" if solvable else "no_unique_solution"],
                          system=system, equations=[e[1] for e in eqs])
    words = len(re.findall(r"[^\W\d_]{3,}", text))
    has_number = bool(re.search(r"\d", text)) or bool(_NUMBER_WORDS.search(text))
    if words >= 6 and has_number:
        return ScanResult("story", False, SCAN_MESSAGES["story"])
    if len(eqs) == 1:
        return ScanResult("other", False, SCAN_MESSAGES["one_equation"])
    return ScanResult("other", False, SCAN_MESSAGES["other"])
