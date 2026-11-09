"""Loads learning content from content/modules/*.json (source of truth, docs/05)."""

import json
from functools import lru_cache

from app.core.config import get_settings
from app.services.step_builder import build_problem


def _hand_steps(problem: dict) -> dict:
    steps = []
    for i, s in enumerate(problem["steps"]):
        s = {**s, "id": f"s{i + 1}", "prefilled": problem.get("mode") == "worked"}
        steps.append(s)
    return {**problem, "source": "content", "steps": steps}


def append_extra_steps(p: dict) -> None:
    n = len(p["steps"])
    for i, s in enumerate(p.get("extra_steps", [])):
        p["steps"].append({**s, "id": f"s{n + i + 1}", "prefilled": False})


def rebuild_with_method(p: dict, method: str) -> dict:
    """Same problem, steps for another method (US-12: student picks the method)."""
    q = build_problem(
        pid=p["id"], system=p["system"], method=method, mode=p["mode"], title=p.get("title", ""),
        module_id=p.get("module_id"), source=p.get("source", "content"), story=p.get("story"),
        literacy=p.get("literacy"),
    )
    q["extra_steps"] = p.get("extra_steps", [])
    append_extra_steps(q)
    for key in ("graph",):
        if key in p:
            q[key] = p[key]
    return q


def _materialize(module: dict, spec: dict) -> dict:
    if "steps" in spec:
        p = _hand_steps(spec)
    else:
        p = build_problem(
            pid=spec["id"], system=spec["system"], method=spec["method"], mode=spec.get("mode", "independent"),
            title=spec.get("title", ""), module_id=module["id"], story=spec.get("story"),
            literacy=spec.get("literacy"), completion_blanks=spec.get("completion_blanks", 1),
        )
        p["extra_steps"] = spec.get("extra_steps", [])
        append_extra_steps(p)
        if spec.get("story", {}).get("table"):
            p["story"]["table"] = spec["story"]["table"]
    p["module_id"] = module["id"]
    p["title"] = spec.get("title", p.get("title", ""))
    if "graph" in spec:
        p["graph"] = spec["graph"]
    return p


@lru_cache
def load_content() -> dict:
    content_dir = get_settings().content_dir / "modules"
    modules: dict[str, dict] = {}
    problems: dict[str, dict] = {}
    for path in sorted(content_dir.glob("*.json")):
        for module in json.loads(path.read_text(encoding="utf-8")):
            specs = module.pop("problems", [])
            module["problem_ids"] = []
            for spec in specs:
                p = _materialize(module, spec)
                problems[p["id"]] = p
                module["problem_ids"].append(p["id"])
            modules[module["id"]] = module
    ordered = dict(sorted(modules.items(), key=lambda kv: kv[1]["order"]))
    return {"modules": ordered, "problems": problems}


def get_module(module_id: str) -> dict | None:
    return load_content()["modules"].get(module_id)


def get_problem(problem_id: str) -> dict | None:
    return load_content()["problems"].get(problem_id)
