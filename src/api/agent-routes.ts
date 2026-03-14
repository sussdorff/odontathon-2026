import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { createBillingCoach } from '../agent'
import { ProgressEmitter } from '../agent/hooks/progress'

const agentRoutes = new Hono()

// Active sessions: sessionId → ProgressEmitter
const sessions = new Map<string, ProgressEmitter>()

agentRoutes.post('/analyze', async (c) => {
  const body = await c.req.json()
  const { patientId, billingItems } = body

  if (!patientId) {
    return c.json({ error: 'patientId ist erforderlich' }, 400)
  }

  const sessionId = randomUUID()
  const emitter = new ProgressEmitter(sessionId)
  sessions.set(sessionId, emitter)

  // Clean up after 5 minutes
  setTimeout(() => sessions.delete(sessionId), 5 * 60 * 1000)

  // Run analysis in background
  const coach = createBillingCoach(emitter)
  coach.analyze({ patientId, billingItems: billingItems ?? [] }).then(result => {
    if (result.report) {
      emitter.emit('analysis_complete', { report: result.report, costUsd: result.costUsd })
    } else if (result.error) {
      emitter.emit('analysis_error', { error: result.error })
    }
  }).catch(err => {
    emitter.emit('analysis_error', { error: String(err) })
  })

  return c.json({
    sessionId,
    streamUrl: `/api/agent/stream/${sessionId}`,
  })
})

agentRoutes.get('/stream/:sessionId', async (c) => {
  const { sessionId } = c.req.param()
  const emitter = sessions.get(sessionId)

  if (!emitter) {
    return c.json({ error: 'Session nicht gefunden' }, 404)
  }

  const em = emitter // narrow for closure
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      function send(event: { type: string; data: unknown }) {
        controller.enqueue(
          encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`)
        )
      }

      // Send any already-buffered events
      for (const evt of em.getEvents()) {
        send(evt)
      }

      // Stream new events
      const onProgress = (event: { type: string; data: unknown }) => {
        send(event)
        if (event.type === 'analysis_complete' || event.type === 'analysis_error') {
          cleanup()
        }
      }

      function cleanup() {
        em.off('progress', onProgress)
        try { controller.close() } catch {}
      }

      em.on('progress', onProgress)

      // Handle client disconnect
      c.req.raw.signal?.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})

export { agentRoutes }
