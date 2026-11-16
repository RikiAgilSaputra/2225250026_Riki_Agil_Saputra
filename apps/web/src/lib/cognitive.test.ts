import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COGNITIVE, COGNITIVE_ORDER, cognitiveInfo } from './cognitive'

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
