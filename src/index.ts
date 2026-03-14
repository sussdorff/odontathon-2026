import { Hono } from 'hono'
import { aidboxConfig } from './lib/config'

const app = new Hono()

app.get('/health', (c) => c.json({ status: 'ok' }))

app.get('/api/catalogs/status', async (c) => {
  const res = await fetch(`${aidboxConfig.fhirBaseUrl}/ChargeItemDefinition?_summary=count`, {
    headers: { Authorization: aidboxConfig.authHeader },
  })
  const data = await res.json()
  return c.json({ catalogEntries: data.total ?? 0 })
})

const port = parseInt(process.env.PORT ?? '3001')
console.log(`Dental Agent API running on port ${port}`)

export default {
  port,
  fetch: app.fetch,
}
