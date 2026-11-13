// Learning content from content/modules/*.json (source of truth, docs/05). Port of app/content.py.
import { learningPath, moduleFiles } from "../content.gen.ts";
import { buildProblem } from "./step_builder.ts";
import type { Json, Problem, Step, Story } from "./types.ts";

export interface Module extends Json {
  id: string;
  kind: string;
  title: string;
  order: number;
  screens: unknown[];
  problem_ids: string[];
  method?: string;
  method_card?: Json;
}

interface PathItem {
  id: string;
  role?: string;
}
export interface LearningPath {
  title: string;
  description?: string;
  stages: { id: string; title: string; description?: string; show_cycle?: boolean; modules: PathItem[] }[];
}

export interface Content {
  modules: Map<string, Module>;
  problems: Map<string, Problem>;
  path: LearningPath;
}

function handSteps(problem: Problem): Problem {
  const steps = problem.steps.map((s, i) => ({ ...s, id: `s${i + 1}`, prefilled: problem.mode === "worked" }));
  return { ...problem, source: "content", steps };
}

export function appendExtraSteps(p: Problem): void {
  const n = p.steps.length;
  (p.extra_steps ?? []).forEach((s, i) => p.steps.push({ ...s, id: `s${n + i + 1}`, prefilled: false } as Step));
}

/** Same problem, steps for another method (US-12: student picks the method). */
export function rebuildWithMethod(p: Problem, method: string): Problem {
  const q = buildProblem({
    pid: p.id, system: p.system ?? [], method, mode: p.mode, title: p.title ?? "",
    module_id: p.module_id ?? null, source: p.source ?? "content", story: p.story ?? null, literacy: p.literacy ?? null,
  });
  q.extra_steps = p.extra_steps ?? [];
  appendExtraSteps(q);
  if ("graph" in p) q.graph = p.graph;
  return q;
}

function materialize(module: Module, spec: Json): Problem {
  let p: Problem;
  if ("steps" in spec) {
    p = handSteps(structuredClone(spec) as unknown as Problem);
  } else {
    const story = (spec.story as Story | undefined) ?? null;
    p = buildProblem({
      pid: spec.id as string, system: spec.system as string[], method: spec.method as string,
      mode: (spec.mode as string | undefined) ?? "independent", title: (spec.title as string | undefined) ?? "",
      module_id: module.id, story: story ? structuredClone(story) : null,
      literacy: (spec.literacy as Json | undefined) ?? null,
      completion_blanks: (spec.completion_blanks as number | undefined) ?? 1,
    });
    p.extra_steps = (spec.extra_steps as Step[] | undefined) ?? [];
    appendExtraSteps(p);
  }
  p.module_id = module.id;
  p.title = (spec.title as string | undefined) ?? p.title ?? "";
  if ("graph" in spec) p.graph = spec.graph;
  return p;
}

function loadPath(modules: Map<string, Module>): LearningPath {
  if (!learningPath) {
    return {
      title: "Belajar", description: "",
      stages: [{ id: "semua", title: "Semua modul", description: "", modules: [...modules.keys()].map((id) => ({ id, role: "inti" })) }],
    };
  }
  const path = structuredClone(learningPath) as LearningPath;
  const listed = new Set<string>();
  for (const stage of path.stages) {
    for (const item of stage.modules) {
      if (!modules.has(item.id)) throw new Error(`path.json refers to unknown module ${item.id}`);
      listed.add(item.id);
    }
  }
  // Safety net: a module missing from path.json still appears (validate_content.py flags it).
  const missing = [...modules.keys()].filter((m) => !listed.has(m));
  if (missing.length) {
    path.stages.push({ id: "lainnya", title: "Modul lainnya", description: "", modules: missing.map((id) => ({ id, role: "inti" })) });
  }
  return path;
}

let cache: Content | null = null;

export function loadContent(): Content {
  if (cache) return cache;
  const modules = new Map<string, Module>();
  const problems = new Map<string, Problem>();
  for (const file of moduleFiles) {
    for (const raw of file as Json[]) {
      const module = structuredClone(raw) as Module;
      const specs = (module.problems as Json[] | undefined) ?? [];
      delete module.problems;
      module.problem_ids = [];
      for (const spec of specs) {
        const p = materialize(module, spec);
        problems.set(p.id, p);
        module.problem_ids.push(p.id);
      }
      modules.set(module.id, module);
    }
  }
  const ordered = new Map([...modules].sort((a, b) => a[1].order - b[1].order));
  cache = { modules: ordered, problems, path: loadPath(ordered) };
  return cache;
}

/** Module ids in learning-path order (used for 'continue' and 'next' recommendations). */
export function pathOrder(): string[] {
  return loadContent().path.stages.flatMap((s) => s.modules.map((m) => m.id));
}

export const getModule = (id: string) => loadContent().modules.get(id);
export const getProblem = (id: string) => loadContent().problems.get(id);
