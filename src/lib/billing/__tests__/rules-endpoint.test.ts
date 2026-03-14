import { describe, expect, it } from 'bun:test'
import { app, VALID_RULE_TYPES } from '../../../index'

describe('GET /api/rules', () => {
  it('returns all rules with correct structure', async () => {
    const res = await app.request('/api/rules')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThan(0)

    for (const type of VALID_RULE_TYPES) {
      expect(body.rules[type]).toBeDefined()
      expect(typeof body.rules[type].count).toBe('number')
      expect(Array.isArray(body.rules[type].items)).toBe(true)
    }

    const sumOfCounts = Object.values(body.rules).reduce(
      (sum: number, group: any) => sum + group.count, 0
    )
    expect(body.total).toBe(sumOfCounts)
  })

  it('filters by type=exclusion', async () => {
    const res = await app.request('/api/rules?type=exclusion')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Object.keys(body.rules)).toEqual(['exclusion'])
    expect(body.total).toBe(body.rules.exclusion.count)
  })

  it('returns 400 for invalid type', async () => {
    const res = await app.request('/api/rules?type=invalid')
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toBe('Invalid rule type')
    expect(body.validTypes).toEqual([...VALID_RULE_TYPES])
  })

  it('returns 400 for empty type', async () => {
    const res = await app.request('/api/rules?type=')
    expect(res.status).toBe(400)
  })
})
