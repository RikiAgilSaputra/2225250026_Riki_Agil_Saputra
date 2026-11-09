"""Problem generator: same pattern, different numbers (GL05, docs/05 §5)."""

import random

from app.services.step_builder import build_problem

STORY_TEMPLATES = [
    {
        "id": "belanja",
        "items": [("buku", "pensil"), ("roti", "susu kotak"), ("bakso", "es jeruk"), ("pulpen", "penghapus")],
        "build": lambda r, a, b: _belanja(r, a, b),
    },
    {
        "id": "kaki",
        "items": [("ayam", "kambing"), ("bebek", "sapi")],
        "build": lambda r, a, b: _kaki(r, a, b),
    },
]


def _rand_nonzero(r: random.Random, lo: int, hi: int) -> int:
    return r.choice([i for i in range(lo, hi + 1) if i != 0])


def _system_for(template: str, r: random.Random) -> list[str]:
    for _ in range(200):
        X, Y = _rand_nonzero(r, -6, 6), _rand_nonzero(r, -6, 6)
        if template == "graph":
            X, Y = r.randint(0, 5), r.randint(0, 5)
            a1, b1 = r.randint(1, 3), 1
            a2, b2 = -r.randint(1, 3), 1
        elif template == "substitution":
            a1, b1 = r.randint(1, 5), 1
            a2, b2 = r.randint(1, 5), r.randint(2, 4)
        elif template == "elimination":
            a1, b1 = r.randint(1, 5), r.randint(1, 3)
            a2, b2 = r.randint(1, 5), r.randint(1, 4)
        else:  # mixed
            a1, b1 = r.randint(1, 4), r.randint(1, 3)
            a2, b2 = r.randint(1, 4), r.randint(1, 3)
        if a1 * b2 - a2 * b1 == 0 or (a1, b1) == (a2, b2):
            continue
        return [f"{a1}*x + {b1}*y = {a1 * X + b1 * Y}", f"{a2}*x + {b2}*y = {a2 * X + b2 * Y}"]
    raise RuntimeError("generator failed")


def _belanja(r: random.Random, item_x: str, item_y: str) -> tuple[list[str], dict]:
    for _ in range(200):
        px, py = r.randint(4, 20) * 500, r.randint(2, 12) * 500
        a1, b1, a2, b2 = r.randint(1, 4), r.randint(1, 4), r.randint(1, 4), r.randint(1, 4)
        if a1 * b2 - a2 * b1 == 0 or px == py:
            continue
        c1, c2 = a1 * px + b1 * py, a2 * px + b2 * py
        t1 = f"{a1} {item_x} dan {b1} {item_y} seharga Rp{c1:,}".replace(",", ".")
        t2 = f"{a2} {item_x} dan {b2} {item_y} seharga Rp{c2:,}".replace(",", ".")
        story = {
            "segments": [
                {"id": "a", "text": f"Ani membeli {t1}.", "tag": "known"},
                {"id": "b", "text": f"Budi membeli {t2}.", "tag": "known"},
                {"id": "c", "text": f"Berapa harga 1 {item_x}?", "tag": "asked"},
            ],
            "variables": {
                "x": {"meaning": f"harga 1 {item_x}", "unit": "rupiah"},
                "y": {"meaning": f"harga 1 {item_y}", "unit": "rupiah"},
            },
            "equation_sources": [t1, t2],
            "target": "x",
        }
        return [f"{a1}*x + {b1}*y = {c1}", f"{a2}*x + {b2}*y = {c2}"], story
    raise RuntimeError("generator failed")


def _kaki(r: random.Random, two: str, four: str) -> tuple[list[str], dict]:
    nx, ny = r.randint(3, 25), r.randint(3, 25)
    total, legs = nx + ny, 2 * nx + 4 * ny
    story = {
        "segments": [
            {"id": "a", "text": f"Di kandang ada {two} dan {four}, jumlahnya {total} ekor.", "tag": "known"},
            {"id": "b", "text": f"Jumlah kakinya {legs}.", "tag": "known"},
            {"id": "c", "text": f"Berapa banyak {four}?", "tag": "asked"},
        ],
        "variables": {
            "x": {"meaning": f"banyak {two}", "unit": "ekor"},
            "y": {"meaning": f"banyak {four}", "unit": "ekor"},
        },
        "variable_distractor": f"x = kaki {two}, y = kaki {four}",
        "equation_sources": [f"jumlahnya {total} ekor", f"Jumlah kakinya {legs} ({two} 2 kaki, {four} 4 kaki)"],
        "target": "y",
    }
    return [f"x + y = {total}", f"2*x + 4*y = {legs}"], story


def generate(template: str, seed: int, module_id: str | None = None) -> dict:
    """template: graph | substitution | elimination | mixed | story"""
    r = random.Random(seed)
    if template == "story":
        tpl = r.choice(STORY_TEMPLATES)
        item_x, item_y = r.choice(tpl["items"])
        system, story = tpl["build"](r, item_x, item_y)
        method = r.choice(["substitution", "elimination", "mixed"])
        return build_problem(
            pid=f"gen-story-{seed}", system=system, method=method, mode="independent",
            title="Soal cerita mirip", module_id=module_id, source="generated", story=story,
            literacy={"level": "L1", "context_category": "personal", "representation": "text",
                      "akm_cognitive": "penerapan", "item_format": "isian"},
        )
    system = _system_for(template, r)
    return build_problem(
        pid=f"gen-{template}-{seed}", system=system, method=template, mode="independent",
        title="Soal lain yang mirip", module_id=module_id, source="generated",
    )
