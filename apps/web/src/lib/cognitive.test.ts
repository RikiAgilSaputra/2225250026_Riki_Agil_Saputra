import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COGNITIVE, COGNITIVE_ORDER, cognitiveInfo, recommendPractice, reflectSteps, TEMPLATE_FUNCTIONS } from './cognitive'

const MODULES_DIR = join(__dirname, '../../../../content/modules')

describe('RMT cognitive functions (docs/15 §4)', () => {
  it('has a label, meaning and question for every function', () => {
    expect(COGNITIVE_ORDER).toHaveLength(10)
    for (const k of COGNITIVE_ORDER) {
      const c = COGNITIVE[k]
      expect(c.label && c.meaning && c.question).toBeTruthy()
      expect(c.meaning.split(/\s+/).length).toBeLessThanOrEqual(15)
    }
  })

  it('knows every cognitive function used in content/', () => {
    const used = new Set<string>()
    for (const f of readdirSync(MODULES_DIR).filter((x) => x.endsWith('.json'))) {
      const text = readFileSync(join(MODULES_DIR, f), 'utf8')
      for (const m of text.matchAll(/"cognitive_function": "([a-z_]+)"/g)) used.add(m[1])
    }
    expect(used.size).toBeGreaterThan(5)
    for (const id of used) expect(cognitiveInfo(id), id).not.toBeNull()
  })

  it('ignores unknown ids', () => {
    expect(cognitiveInfo('nope')).toBeNull()
    expect(cognitiveInfo(undefined)).toBeNull()
  })
})

describe('RMT practice support', () => {
  it('recommends a practice for the weakest practised function', () => {
    const r = recommendPractice({ comparing: 90, projecting_relationships: 55, encoding: 70, labeling: null })
    expect(r).toEqual({ fn: 'projecting_relationships', score: 55, template: 'substitution' })
  })

  it('recommends nothing when every practised function is strong or unpractised', () => {
    expect(recommendPractice({ comparing: 95, encoding: null })).toBeNull()
    expect(recommendPractice(undefined)).toBeNull()
  })

  it('every template trains only known functions', () => {
    for (const fns of Object.values(TEMPLATE_FUNCTIONS)) for (const fn of fns) expect(cognitiveInfo(fn)).not.toBeNull()
  })

  it('reflects each function by its weakest step', () => {
    const r = reflectSteps([
      { cognitive_function: 'labeling', prefilled: false, status: 'correct', tries: 1 },
      { cognitive_function: 'encoding', prefilled: false, status: 'correct', tries: 3 },
      { cognitive_function: 'encoding', prefilled: false, status: 'correct', tries: 1 },
      { cognitive_function: 'logical_evidence', prefilled: false, status: 'revealed', tries: 2 },
      { cognitive_function: 'comparing', prefilled: true, status: 'prefilled', tries: 0 },
    ])
    expect(r).toEqual([
      { fn: 'labeling', growth: 'lancar' },
      { fn: 'encoding', growth: 'berkembang' },
      { fn: 'logical_evidence', growth: 'perlu' },
    ])
  })
})
