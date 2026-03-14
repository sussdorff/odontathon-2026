import { Hono } from 'hono'
import { PracticeRuleStore } from '../lib/practice-rules/store'

const practiceRulesRoutes = new Hono()
const store = new PracticeRuleStore()

practiceRulesRoutes.get('/', async (c) => {
  const ruleSet = await store.getAll()
  return c.json(ruleSet)
})

practiceRulesRoutes.put('/', async (c) => {
  const body = await c.req.json()

  if (!body.rules || !Array.isArray(body.rules)) {
    return c.json({ error: 'rules Array ist erforderlich' }, 400)
  }

  const current = await store.getAll()
  const updated = await store.save({
    ...current,
    rules: body.rules,
  })

  return c.json(updated)
})

export { practiceRulesRoutes }
