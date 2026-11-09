"""Extract numbers from Indonesian text: 'Rp19.000', '19 ribu', '1,5 juta', 'dua puluh', 'selusin'."""

import re
from fractions import Fraction

UNITS = {
    "nol": 0, "satu": 1, "se": 1, "dua": 2, "tiga": 3, "empat": 4, "lima": 5, "enam": 6,
    "tujuh": 7, "delapan": 8, "sembilan": 9, "sepuluh": 10, "sebelas": 11, "seratus": 100,
    "seribu": 1000,
}
SCALE = {"puluh": 10, "belas": None, "ratus": 100, "ribu": 1000, "juta": 1_000_000}
SPECIAL = {"setengah": Fraction(1, 2), "seperempat": Fraction(1, 4), "selusin": 12, "lusin": 12,
           "sekodi": 20, "kodi": 20, "pasang": 2, "separuh": Fraction(1, 2)}

_NUM = re.compile(r"(\d+(?:\.\d{3})+|\d+(?:,\d+)?)(\s*(ribu|rb|juta|jt))?", re.IGNORECASE)


def _to_number(token: str) -> Fraction:
    if re.fullmatch(r"\d+(?:\.\d{3})+", token):
        return Fraction(int(token.replace(".", "")))
    return Fraction(token.replace(",", "."))


def _words_to_numbers(text: str) -> set[Fraction]:
    found: set[Fraction] = set()
    tokens = re.findall(r"[a-z]+", text.lower())
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t in SPECIAL:
            found.add(Fraction(SPECIAL[t]))
            i += 1
            continue
        if t in UNITS:
            value = UNITS[t]
            j = i + 1
            while j < len(tokens) and tokens[j] in SCALE:
                s = tokens[j]
                value = value + 10 if s == "belas" else value * SCALE[s]
                j += 1
            found.add(Fraction(value))
            i = j
            continue
        i += 1
    return found


def extract_numbers(text: str) -> set[Fraction]:
    nums: set[Fraction] = set()
    for m in _NUM.finditer(text):
        value = _to_number(m.group(1))
        scale = (m.group(3) or "").lower()
        if scale in ("ribu", "rb"):
            value *= 1000
        elif scale in ("juta", "jt"):
            value *= 1_000_000
        nums.add(value)
        nums.add(_to_number(m.group(1)))
    nums |= _words_to_numbers(text)
    return nums
