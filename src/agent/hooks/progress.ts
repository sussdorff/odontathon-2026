import { EventEmitter } from 'node:events'

export type ProgressEventType =
  | 'analysis_start'
  | 'agent_start'
  | 'agent_complete'
  | 'agent_progress'
  | 'finding'
  | 'analysis_complete'
  | 'analysis_error'

export interface ProgressEvent {
  type: ProgressEventType
  timestamp: string
  data: unknown
}

export class ProgressEmitter extends EventEmitter {
  readonly sessionId: string
  private events: ProgressEvent[] = []

  constructor(sessionId: string) {
    super()
    this.sessionId = sessionId
  }

  emit(type: ProgressEventType, data: unknown): boolean {
    const event: ProgressEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    }
    this.events.push(event)
    return super.emit('progress', event)
  }

  getEvents(): ProgressEvent[] {
    return [...this.events]
  }
}
