import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useChatStore } from '@/stores/chat-store'
import { apiFetch } from '@/lib/api'
import type { ChatResponse } from '@/types'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    sessionId,
    messages,
    followUpQuestions,
    isLoading,
    setSessionId,
    addMessage,
    setProposedCodes,
    setFollowUpQuestions,
    setIsLoading,
  } = useChatStore()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      setInput('')
      addMessage({ role: 'user', content: trimmed })
      setIsLoading(true)
      setFollowUpQuestions([])

      try {
        const res = await apiFetch<ChatResponse>('/api/agent/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: trimmed,
            sessionId: sessionId ?? undefined,
          }),
        })

        setSessionId(res.sessionId)
        addMessage({ role: 'assistant', content: res.message })
        setProposedCodes(res.proposedItems ?? [])
        setFollowUpQuestions(res.followUpQuestions ?? [])
      } catch (err) {
        addMessage({
          role: 'assistant',
          content: `Fehler: ${(err as Error).message}`,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, sessionId, addMessage, setSessionId, setProposedCodes, setFollowUpQuestions, setIsLoading]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      sendMessage(input)
    },
    [input, sendMessage]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(input)
      }
    },
    [input, sendMessage]
  )

  const handleFollowUp = useCallback(
    (question: string) => {
      sendMessage(question)
    },
    [sendMessage]
  )

  return (
    <Card className="flex flex-col h-full min-h-[500px]">
      <CardHeader className="p-4">
        <CardTitle>Billing Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-8 italic">
              Schildern Sie den Befund oder stellen Sie eine Frage zum Billing Coach.
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                <Loader2 size={16} className="animate-spin text-gray-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Follow-up question buttons */}
        {followUpQuestions.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gray-100">
            {followUpQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleFollowUp(q)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200
                  hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Befund schildern oder Frage stellen… (Enter zum Senden)"
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none text-sm px-3 py-2 border border-gray-300 rounded-lg
              focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="self-end px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Send size={16} />
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
