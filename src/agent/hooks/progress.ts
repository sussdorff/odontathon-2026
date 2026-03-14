import { EventEmitter } from 'node:events'

export type ProgressEventType =
  | 'analysis_start'
  | 'analysis_complete'
  | 'analysis_error'
  // Manager-level
  | 'manager_thinking'
  | 'manager_tool_call'
  | 'manager_tool_result'
  // Sub-agent lifecycle
  | 'agent_start'
  | 'agent_progress'
  | 'agent_tool_call'
  | 'agent_complete'
  // Findings
  | 'finding'

export interface ProgressEvent {
  type: ProgressEventType
  timestamp: string
  data: Record<string, unknown>
}

export class ProgressEmitter extends EventEmitter {
  readonly sessionId: string
  private events: ProgressEvent[] = []

  constructor(sessionId: string) {
    super()
    this.sessionId = sessionId
  }

  emit(type: ProgressEventType, data: Record<string, unknown>): boolean {
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
