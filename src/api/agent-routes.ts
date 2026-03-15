import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createBillingCoach } from '../agent'
import { ProgressEmitter } from '../agent/hooks/progress'

const FIXTURE_MODE = process.env.AGENT_FIXTURE_MODE === 'true'
const FIXTURES_DIR = join(import.meta.dir, '../../data/fixtures')
import { BillingAgent } from '../agent/billing-agent'
import type { ConversationState } from '../agent/billing-agent'

const agentRoutes = new Hono()

// Active sessions: sessionId → ProgressEmitter
const sessions = new Map<string, ProgressEmitter>()

// Chat sessions: sessionId → ConversationState (in-memory)
const chatSessions = new Map<string, ConversationState>()
const billingAgent = new BillingAgent()

// POST /api/agent/chat — synchronous conversational endpoint
agentRoutes.post('/chat', async (c) => {
  const body = await c.req.json()
  const { message, sessionId: incomingSessionId, patientId } = body

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return c.json({ error: 'message ist erforderlich' }, 400)
  }

  // Resolve or create session
  let sessionId = incomingSessionId
  let state: ConversationState
  if (sessionId && chatSessions.has(sessionId)) {
    state = chatSessions.get(sessionId)!
  } else {
    sessionId = sessionId ?? randomUUID()
    state = billingAgent.createSession(sessionId)
  }

  // Optionally prepend patient context
  const userMessage = patientId
    ? `[Patient-ID: ${patientId}] ${message}`
    : message

  const { state: updatedState, response } = await billingAgent.chat(state, userMessage)

  // Persist updated state (TTL: 30 min)
  chatSessions.set(sessionId, updatedState)
  setTimeout(() => chatSessions.delete(sessionId), 30 * 60 * 1000)

  return c.json({
    sessionId,
    message: response.message,
    proposedItems: response.proposedItems,
    validationIssues: response.validationIssues,
    followUpQuestions: response.followUpQuestions,
    isComplete: response.isComplete,
  })
})

agentRoutes.post('/analyze', async (c) => {
  const body = await c.req.json()
  const { patientId, billingItems, history, analysisDate } = body

  if (!patientId) {
    return c.json({ error: 'patientId ist erforderlich' }, 400)
  }

  const sessionId = randomUUID()
  const emitter = new ProgressEmitter(sessionId)
  sessions.set(sessionId, emitter)

  // Clean up after 5 minutes
  setTimeout(() => sessions.delete(sessionId), 5 * 60 * 1000)

  // Fixture mode: return pre-recorded report
  if (FIXTURE_MODE && analysisDate) {
    const fixturePath = join(FIXTURES_DIR, patientId, `${analysisDate}.json`)
    ;(async () => {
      emitter.emit('analysis_start', { patientId, itemCount: (billingItems ?? []).length })
      try {
        const raw = await readFile(fixturePath, 'utf-8')
        const report = JSON.parse(raw)
        // Simulate status progression so fixture-mode E2E exercises the status UI
        emitter.emit('analysis_status', { label: 'Patientenkontext wird geladen...' })
        await new Promise(r => setTimeout(r, 300))
        emitter.emit('analysis_status', { label: 'Abrechnungsregeln werden geprüft...' })
        await new Promise(r => setTimeout(r, 300))
        emitter.emit('analysis_status', { label: 'Dokumentation wird geprüft...' })
        await new Promise(r => setTimeout(r, 300))
        emitter.emit('analysis_status', { label: 'Abrechnungsmuster werden abgeglichen...' })
        await new Promise(r => setTimeout(r, 200))
        emitter.emit('analysis_status', { label: 'Vorschläge werden erstellt...' })
        await new Promise(r => setTimeout(r, 150))
        emitter.emit('analysis_complete', { report, costUsd: 0 })
      } catch {
        emitter.emit('analysis_error', { error: `Fixture nicht gefunden: ${fixturePath}` })
      }
    })()

    return c.json({ sessionId, streamUrl: `/api/agent/stream/${sessionId}` })
  }

  // Run real analysis in background
  // Note: createBillingCoach emits analysis_complete/analysis_error internally — no need to re-emit here
  const coach = createBillingCoach(emitter)
  coach.analyze({ patientId, billingItems: billingItems ?? [], history: history ?? [], analysisDate: analysisDate ?? undefined }).catch(err => {
    // Only emit error if the coach didn't already (e.g. unhandled exception in setup)
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
