"""Builds guided steps (with 3-level hints) for an SPLDV.

One builder serves bank problems, generated problems and AI-modeled problems,
so method steps are always consistent (IL02: steps must not get mixed up).
Instructions stay short (CLT rule R1); hints follow docs/04 §7.
"""

from math import gcd

from sympy import Rational, Symbol, nsimplify, solve

from app.services import mathparse as mp
from app.services.mathparse import fmt_linear, fmt_number

X, Y = mp.x, mp.y
VAR = {"x": X, "y": Y}

METHOD_LABELS = {
    "graph": "Grafik",
    "substitution": "Substitusi",
    "elimination": "Eliminasi",
    "mixed": "Campuran",
}


# ---------------------------------------------------------------- system utils
def parse_system(system: list[str]) -> list[tuple[Rational, Rational, Rational]]:
    """['2*x + y = 7', ...] -> [(a, b, c)] meaning a*x + b*y = c, integer coefficients."""
    out = []
    for eq in system:
        lhs, rhs = mp.parse_equation(eq)
        vec = mp.equation_vector(lhs, rhs)
        if vec is None:
            raise ValueError(f"Not linear: {eq}")
        a, b, c0 = vec
        a, b, c = nsimplify(a), nsimplify(b), nsimplify(-c0)
        den = 1
        for v in (a, b, c):
            den = den * v.q // gcd(den, v.q)
        a, b, c = a * den, b * den, c * den
        # Flip only when every variable coefficient is negative (keeps story forms like −2000x + y)
        if a <= 0 and b <= 0:
            a, b, c = -a, -b, -c
        out.append((a, b, c))
    return out


def solve_system(eqs) -> dict | None:
    (a1, b1, c1), (a2, b2, c2) = eqs
    det = a1 * b2 - a2 * b1
    if det == 0:
        return None
    return {"x": Rational(c1 * b2 - c2 * b1, det), "y": Rational(a1 * c2 - a2 * c1, det)}


def eq_str(a, b, c) -> str:
    return f"({a})*x + ({b})*y = {c}"


def pretty(a, b, c) -> str:
    return fmt_linear(a, b, 0, c)


def _num(v) -> str:
    return str(nsimplify(v))


def _step(sid, instruction, check, expected, display, hints, **extra) -> dict:
    return {
        "id": sid,
        "instruction": instruction,
        "check": check,
        "expected": expected,
        "display": display,
        "hints": hints,
        **extra,
    }


# ---------------------------------------------------------------- methods
def substitution_steps(eqs, sol) -> list[dict]:
    order = [(0, "y"), (1, "y"), (0, "x"), (1, "x")]
    pick = next(((i, v) for i, v in order if abs(eqs[i][0 if v == "x" else 1]) == 1), (0, "y"))
    i, v = pick
    j = 1 - i
    o = "x" if v == "y" else "y"
    a, b, c = eqs[i]
    coef_v, coef_o = (b, a) if v == "y" else (a, b)
    if coef_v == 0:  # fallback: isolate the other variable
        v, o = o, v
        coef_v, coef_o = coef_o, coef_v
    iso = (c - coef_o * VAR[o]) / coef_v  # v = iso
    iso_s = fmt_iso(iso, o)
    aj, bj, cj = eqs[j]
    cvj = bj if v == "y" else aj
    coj = aj if v == "y" else bj
    sub_expr = (coj * VAR[o] + cvj * iso).expand()
    A, C0 = sub_expr.coeff(VAR[o], 1), sub_expr.subs(VAR[o], 0)
    simplified = f"{fmt_linear(A if o == 'x' else 0, A if o == 'y' else 0, 0, cj - C0)}"
    o_val, v_val = sol[o], sol[v]
    coj_s = "" if coj == 1 else ("−" if coj == -1 else fmt_number(coj))
    cvj_s = "" if cvj == 1 else ("−" if cvj == -1 else fmt_number(cvj))
    sub_display = f"{coj_s}{o} + {cvj_s}({iso_s}) = {fmt_number(cj)}" if coj != 0 else f"{cvj_s}({iso_s}) = {fmt_number(cj)}"
    return [
        _step(
            "m1", f"Ubah persamaan ({i + 1}) menjadi {v} = ...", "equation_equivalent",
            f"{v} = {iso}", f"{v} = {iso_s}",
            [
                f"Tujuannya: {v} sendirian di ruas kiri.",
                f"Pindahkan suku {o} ke ruas kanan. Tandanya berubah.",
                f"{pretty(a, b, c)}  →  {v} = {iso_s}",
            ],
        ),
        _step(
            "m2", f"Masukkan {v} = {iso_s} ke persamaan ({j + 1}).", "equation_equivalent",
            f"{coj}*{o} + ({cvj})*({iso}) = {cj}", sub_display,
            [
                f"Ganti {v} di persamaan ({j + 1}) dengan bentuk dari langkah sebelumnya.",
                f"Persamaan ({j + 1}): {pretty(aj, bj, cj)}. Tulis ({iso_s}) di tempat {v}.",
                sub_display,
            ],
        ),
        _step(
            "m3", f"Tentukan nilai {o}.", "value", _num(o_val), f"{o} = {fmt_number(o_val)}",
            [
                f"Sederhanakan, kumpulkan suku {o} di satu ruas.",
                f"Persamaannya menjadi {simplified}.",
                f"{o} = {fmt_number(o_val)}",
            ],
            variable=o, other_value=_num(v_val),
        ),
        _step(
            "m4", f"Masukkan {o} = {fmt_number(o_val)} ke {v} = {iso_s}. Tentukan {v}.", "value",
            _num(v_val), f"{v} = {fmt_number(v_val)}",
            [
                f"Ganti {o} dengan {fmt_number(o_val)}.",
                f"{v} = {iso_s.replace(o, f'({fmt_number(o_val)})') if iso_s else ''}",
                f"{v} = {fmt_number(v_val)}",
            ],
            variable=v, other_value=_num(o_val),
        ),
    ]


def _lin_parts(expr, var):
    """expr in one variable -> (a, b, c) for fmt_linear."""
    expr = expr.expand()
    k = expr.coeff(VAR[var], 1)
    c = expr.subs(VAR[var], 0)
    return (k, 0, c) if var == "x" else (0, k, c)


def fmt_iso(expr, var) -> str:
    """Textbook order: '7 − 2x' rather than '−2x + 7'."""
    a, b, c = _lin_parts(expr, var)
    k = a or b
    if k < 0 and c > 0:
        mag = "" if k == -1 else fmt_number(-k)
        return f"{fmt_number(c)} − {mag}{var}"
    return fmt_linear(a, b, c)


def _elimination_core(eqs, sol, elim: str):
    """Steps that make coefficients of `elim` equal and combine. Returns (steps, keep, combined)."""
    keep = "x" if elim == "y" else "y"
    idx = 1 if elim == "y" else 0
    (a1, b1, c1), (a2, b2, c2) = eqs
    e1, e2 = (b1, b2) if elim == "y" else (a1, a2)
    g = gcd(int(abs(e1)), int(abs(e2)))
    m1, m2 = abs(e2) // g, abs(e1) // g
    s1 = (a1 * m1, b1 * m1, c1 * m1)
    s2 = (a2 * m2, b2 * m2, c2 * m2)
    steps = []
    for n, (m, orig, scaled) in enumerate(((m1, eqs[0], s1), (m2, eqs[1], s2)), start=1):
        if m != 1:
            steps.append(
                _step(
                    f"e{n}", f"Kalikan persamaan ({n}) dengan {fmt_number(m)} agar koefisien {elim} sama.",
                    "equation_scaled", eq_str(*scaled), pretty(*scaled),
                    [
                        f"Koefisien {elim} harus sama besar di kedua persamaan.",
                        f"Kalikan semua suku persamaan ({n}) dengan {fmt_number(m)}, kedua ruas.",
                        f"{pretty(*orig)}  ×{fmt_number(m)}  →  {pretty(*scaled)}",
                    ],
                )
            )
    same_sign = (s1[idx] > 0) == (s2[idx] > 0)
    op = "Kurangkan" if same_sign else "Jumlahkan"
    sign = -1 if same_sign else 1
    comb = (s1[0] + sign * s2[0], s1[1] + sign * s2[1], s1[2] + sign * s2[2])
    steps.append(
        _step(
            "e3", f"{op} kedua persamaan untuk menghilangkan {elim}.", "equation_equivalent",
            eq_str(*comb), pretty(*comb),
            [
                f"Tujuannya: {elim} hilang, tinggal {keep}.",
                f"Tanda koefisien {elim} {'sama, jadi dikurangkan' if same_sign else 'berlawanan, jadi dijumlahkan'}.",
                f"{pretty(*s1)}\n{'−' if same_sign else '+'} {pretty(*s2)}\n= {pretty(*comb)}",
            ],
        )
    )
    k_val = sol[keep]
    if abs(comb[0] or comb[1]) != 1:  # otherwise the combined equation already gives the value
        steps.append(
            _step(
                "e4", f"Tentukan nilai {keep}.", "value", _num(k_val), f"{keep} = {fmt_number(k_val)}",
                [
                    f"Bagi kedua ruas dengan koefisien {keep}.",
                    f"{pretty(*comb)}  →  {keep} = {fmt_number(comb[2])} : {fmt_number(comb[0] or comb[1])}",
                    f"{keep} = {fmt_number(k_val)}",
                ],
                variable=keep, other_value=_num(sol[elim]),
            )
        )
    return steps, keep


def _coef(k) -> str:
    return "" if k == 1 else ("−" if k == -1 else fmt_number(k))


def elimination_steps(eqs, sol) -> list[dict]:
    elim = "y" if eqs[0][1] != 0 and eqs[1][1] != 0 else "x"
    steps, keep = _elimination_core(eqs, sol, elim)
    other_val = sol[elim]
    steps.append(
        _step(
            "e5", f"Ulangi eliminasi: hilangkan {keep} untuk mencari {elim}.", "value",
            _num(other_val), f"{elim} = {fmt_number(other_val)}",
            [
                f"Sekarang samakan koefisien {keep}.",
                f"Kalikan, lalu kurangkan atau jumlahkan seperti tadi agar {keep} hilang.",
                f"{elim} = {fmt_number(other_val)}",
            ],
            variable=elim, other_value=_num(sol[keep]),
        )
    )
    return steps


def mixed_steps(eqs, sol) -> list[dict]:
    elim = "y" if eqs[0][1] != 0 and eqs[1][1] != 0 else "x"
    steps, keep = _elimination_core(eqs, sol, elim)
    a1, b1, c1 = eqs[0]
    kv = sol[keep]
    if keep == "x":
        sub = (0, b1, c1 - a1 * kv)
        sub_display = f"{_coef(a1)}({fmt_number(kv)}) + {_coef(b1)}y = {fmt_number(c1)}"
    else:
        sub = (a1, 0, c1 - b1 * kv)
        sub_display = f"{_coef(a1)}x + {_coef(b1)}({fmt_number(kv)}) = {fmt_number(c1)}"
    steps.append(
        _step(
            "c1", f"Masukkan {keep} = {fmt_number(kv)} ke persamaan (1).", "equation_equivalent",
            eq_str(*sub), sub_display,
            [
                "Ini bagian substitusi: masukkan nilai yang sudah ditemukan.",
                f"Persamaan (1): {pretty(*eqs[0])}. Ganti {keep} dengan {fmt_number(kv)}.",
                sub_display,
            ],
        )
    )
    ev = sol[elim]
    steps.append(
        _step(
            "c2", f"Tentukan nilai {elim}.", "value", _num(ev), f"{elim} = {fmt_number(ev)}",
            [
                f"Pindahkan konstanta, lalu bagi dengan koefisien {elim}.",
                f"{pretty(*sub)}",
                f"{elim} = {fmt_number(ev)}",
            ],
            variable=elim, other_value=_num(kv),
        )
    )
    return steps


def graph_steps(eqs, sol) -> list[dict]:
    steps = []
    for n, (a, b, c) in enumerate(eqs, start=1):
        if b != 0:
            yi = Rational(c, b)
            steps.append(
                _step(
                    f"g{n}", f"Garis ({n}): jika x = 0, berapa nilai y?", "value", _num(yi),
                    f"y = {fmt_number(yi)}  →  titik (0, {fmt_number(yi)})",
                    [
                        "Ganti x dengan 0 pada persamaannya.",
                        f"{fmt_number(b) if b != 1 else ''}y = {fmt_number(c)}",
                        f"y = {fmt_number(yi)}",
                    ],
                    variable="y", show_graph=True,
                )
            )
        else:
            xi = Rational(c, a)
            steps.append(
                _step(
                    f"g{n}", f"Garis ({n}): berapa nilai x?", "value", _num(xi), f"x = {fmt_number(xi)}",
                    ["Garis ini tegak.", f"{fmt_number(a)}x = {fmt_number(c)}", f"x = {fmt_number(xi)}"],
                    variable="x", show_graph=True,
                )
            )
    steps.append(
        _step(
            "g3", "Lihat grafik. Di titik mana kedua garis berpotongan?", "point",
            [_num(sol["x"]), _num(sol["y"])], f"({fmt_number(sol['x'])}, {fmt_number(sol['y'])})",
            [
                "Cari titik yang dilalui kedua garis sekaligus.",
                f"Titik potongnya ada di x = {fmt_number(sol['x'])}.",
                f"({fmt_number(sol['x'])}, {fmt_number(sol['y'])})",
            ],
            show_graph=True,
        )
    )
    return steps


BUILDERS = {
    "substitution": substitution_steps,
    "elimination": elimination_steps,
    "mixed": mixed_steps,
    "graph": graph_steps,
}


# ---------------------------------------------------------------- stories
def story_steps(story: dict, eqs, sol, *, include_highlight: bool) -> tuple[list[dict], list[dict]]:
    """Modeling-cycle steps (docs/13 §3). Returns (before_method, after_method)."""
    vx, vy = story["variables"]["x"], story["variables"]["y"]
    before: list[dict] = []
    segs = story.get("segments") or []
    if include_highlight and any(s.get("tag") for s in segs):
        tags = {s["id"]: s.get("tag", "") for s in segs}
        known = [s["text"] for s in segs if s.get("tag") == "known"]
        before.append(
            _step(
                "p1", "Tandai yang diketahui dan yang ditanyakan.", "highlight_spans", tags,
                "Diketahui: " + " / ".join(known),
                [
                    "Diketahui = informasi yang berisi angka dan dipakai.",
                    "Ditanya biasanya diawali kata 'berapa' atau 'tentukan'.",
                    "Diketahui: " + " / ".join(known),
                ],
                modeling_stage=1,
            )
        )
    correct = f"x = {vx['meaning']} ({vx['unit']}), y = {vy['meaning']} ({vy['unit']})"
    swapped = f"x = {vy['meaning']} ({vy['unit']}), y = {vx['meaning']} ({vx['unit']})"
    distract = story.get("variable_distractor") or f"x = banyak {vx['meaning'].split()[-1]}, y = total semuanya"
    choices = [{"id": "a", "label": correct}, {"id": "b", "label": distract}, {"id": "c", "label": swapped}]
    before.append(
        _step(
            "p2", "Pilih arti x dan y.", "define_variables", "a", correct,
            [
                "x dan y adalah dua hal yang belum diketahui nilainya.",
                "Cari dua hal yang nilainya dicari dalam cerita.",
                correct,
            ],
            choices=choices, modeling_stage=2, wrong_code="WRONG_CHOICE",
        )
    )
    sources = story.get("equation_sources") or ["persamaan pertama", "persamaan kedua"]
    for n, ((a, b, c), src) in enumerate(zip(eqs, sources, strict=True), start=1):
        before.append(
            _step(
                f"t{n}", f"Tulis persamaan ({n}) dari: “{src}”", "equation_equivalent",
                eq_str(a, b, c), pretty(a, b, c),
                [
                    "Ganti setiap hal yang dicari dengan x atau y.",
                    "Banyaknya × nilai satuan, lalu jumlahkan. Hasilnya di ruas kanan.",
                    pretty(a, b, c),
                ],
                modeling_stage=3,
            )
        )
    after: list[dict] = []
    target = story.get("target", "x")
    target_expr = mp.parse_expression(target)
    tval = target_expr.subs({X: sol["x"], Y: sol["y"]})
    unit = story.get("target_unit") or (vy["unit"] if target == "y" else vx["unit"])
    tdesc = story.get("target_label") or (vx["meaning"] if target == "x" else vy["meaning"] if target == "y" else "yang ditanyakan")
    wrong1 = sol["y"] if target == "x" else sol["x"] if target == "y" else sol["x"] + sol["y"]
    wrong2 = tval * 10 if tval != 0 else 1
    options = [
        {"id": "a", "label": f"Jadi, {tdesc} adalah {fmt_number(tval)} {unit}."},
        {"id": "b", "label": f"Jadi, {tdesc} adalah {fmt_number(wrong1)} {unit}."},
        {"id": "c", "label": f"Jadi, {tdesc} adalah {fmt_number(wrong2)} {unit}."},
    ]
    if target not in ("x", "y"):
        after.append(
            _step(
                "r0", f"Hitung yang ditanyakan: {fmt_linear(*_target_parts(target_expr))}.", "value",
                _num(tval), fmt_number(tval),
                [
                    "Pakai nilai x dan y yang sudah kamu temukan.",
                    f"Ganti x = {fmt_number(sol['x'])} dan y = {fmt_number(sol['y'])}.",
                    fmt_number(tval),
                ],
                modeling_stage=5,
            )
        )
    after.append(
        _step(
            "r1", "Tulis kembali jawabannya dalam cerita.", "interpret", "a", options[0]["label"],
            [
                "Kembali ke pertanyaan: apa yang ditanyakan?",
                f"Yang ditanya: {tdesc}. Satuannya {unit}.",
                options[0]["label"],
            ],
            choices=_shuffle_stable(options), modeling_stage=5,
        )
    )
    a1, b1, c1 = eqs[0]
    after.append(
        _step(
            "r2", f"Periksa ke cerita: hitung {fmt_linear(a1, b1)} dengan nilai x dan y-mu.", "value",
            _num(c1), f"{fmt_number(c1)} — sesuai cerita ✓",
            [
                "Jawaban yang benar harus cocok dengan cerita.",
                f"Hitung {fmt_number(a1)} × {fmt_number(sol['x'])} + {fmt_number(b1)} × {fmt_number(sol['y'])}.",
                fmt_number(c1),
            ],
            modeling_stage=6,
        )
    )
    return before, after


def _target_parts(expr):
    a, b, c = mp.linear_coeffs(expr)
    return a, b, c


def _shuffle_stable(options: list[dict]) -> list[dict]:
    # Deterministic order so the correct answer is not always first.
    return [options[1], options[0], options[2]]


# ---------------------------------------------------------------- public API
def build_problem(
    *,
    pid: str,
    system: list[str],
    method: str,
    mode: str = "independent",
    title: str = "",
    module_id: str | None = None,
    source: str = "content",
    story: dict | None = None,
    literacy: dict | None = None,
    completion_blanks: int = 1,
) -> dict:
    eqs = parse_system(system)
    sol = solve_system(eqs)
    if sol is None:
        raise ValueError("System has no unique solution")
    method_steps = BUILDERS[method](eqs, sol)
    for s in method_steps:
        s.setdefault("modeling_stage", 4 if story else None)
    before, after = ([], [])
    if story:
        before, after = story_steps(story, eqs, sol, include_highlight=source == "content")
    steps = before + method_steps + after
    for i, s in enumerate(steps):
        s["id"] = f"s{i + 1}"
        s["prefilled"] = mode == "worked"
    if mode == "completion":
        for s in steps[: max(0, len(steps) - completion_blanks)]:
            s["prefilled"] = True
    return {
        "id": pid,
        "module_id": module_id,
        "title": title,
        "mode": mode,
        "method": method,
        "source": source,
        "system": [eq_str(*e) for e in eqs],
        "system_display": [pretty(*e) for e in eqs],
        "solution": {"x": _num(sol["x"]), "y": _num(sol["y"])},
        "story": story,
        "literacy": literacy,
        "steps": steps,
    }


__all__ = ["build_problem", "parse_system", "solve_system", "METHOD_LABELS", "Symbol", "solve"]
