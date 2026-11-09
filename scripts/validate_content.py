"""Validates content/ against the CLT content rules (docs/04 §3) and checks every answer key.

Run from repo root:  apps/api/.venv/Scripts/python scripts/validate_content.py
Exit code 1 on any violation (used in CI).
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from app.content import load_content  # noqa: E402
from app.services.step_checker import check_step  # noqa: E402

MAX_WORDS = 25
errors: list[str] = []


def words(text: str) -> int:
    # Quoted story text inside “…” does not count toward the instruction budget.
    return len(re.sub(r"“[^”]*”", "", text).split())


def sentences(text: str) -> int:
    return len([s for s in re.split(r"(?<=[.!?])\s+", re.sub(r"“[^”]*”", "", text).strip()) if s])


content = load_content()
for m in content["modules"].values():
    for i, screen in enumerate(m["screens"]):
        ins = screen["instruction"]
        if words(ins) > MAX_WORDS or sentences(ins) > 2:
            errors.append(f"{m['id']} screen {i + 1}: instruction too long ({words(ins)} words)")
        if not screen.get("concept"):
            errors.append(f"{m['id']} screen {i + 1}: missing single concept")
    card = m.get("method_card")
    if card and len(card["steps"]) > 4:
        errors.append(f"{m['id']}: method card has more than 4 steps")

for p in content["problems"].values():
    story = p.get("story")
    for s in p["steps"]:
        where = f"{p['id']}/{s['id']}"
        if len(s.get("hints", [])) != 3:
            errors.append(f"{where}: needs exactly 3 hints")
        if words(s["instruction"]) > MAX_WORDS:
            errors.append(f"{where}: instruction {words(s['instruction'])} words")
        exp = s["expected"]
        ans = f"({exp[0]}, {exp[1]})" if s["check"] == "point" else exp
        if not check_step(s, ans).correct:
            errors.append(f"{where}: expected answer fails its own check")
    if story:
        stages = [s.get("modeling_stage") for s in p["steps"]]
        if 2 not in stages or 5 not in stages:
            errors.append(f"{p['id']}: story problem must define variables (2) and interpret (5)")
        if not p.get("literacy"):
            errors.append(f"{p['id']}: story problem missing literacy metadata")

print(f"{len(content['modules'])} modules, {len(content['problems'])} problems checked")
if errors:
    print("\n".join(f"  ✗ {e}" for e in errors))
    sys.exit(1)
print("✓ content OK")
