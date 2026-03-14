import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import type { PracticeRuleSet } from './types'

const DATA_PATH = join(import.meta.dir, '../../../data/practice-rules/default.json')

const EMPTY_RULESET: PracticeRuleSet = {
  version: 0,
  updatedAt: new Date().toISOString(),
  rules: [],
}

export class PracticeRuleStore {
  private cache: PracticeRuleSet | null = null

  async getAll(): Promise<PracticeRuleSet> {
    if (this.cache) return this.cache

    try {
      const raw = await readFile(DATA_PATH, 'utf-8')
      this.cache = JSON.parse(raw) as PracticeRuleSet
      return this.cache
    } catch {
      return EMPTY_RULESET
    }
  }

  async save(ruleSet: PracticeRuleSet): Promise<PracticeRuleSet> {
    const updated: PracticeRuleSet = {
      ...ruleSet,
      version: ruleSet.version + 1,
      updatedAt: new Date().toISOString(),
    }

    await mkdir(dirname(DATA_PATH), { recursive: true })
    await writeFile(DATA_PATH, JSON.stringify(updated, null, 2), 'utf-8')
    this.cache = updated
    return updated
  }

  invalidateCache() {
    this.cache = null
  }
}
