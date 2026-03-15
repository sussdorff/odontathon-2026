import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvoiceAnalysisPanel } from '@/components/panels/invoice-analysis-panel'
import { SessionLayout } from '@/components/session/session-layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

type Tab = 'session' | 'abrechnung'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('session')

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#f0f2f5]">
        <header
          className="px-8 py-3.5 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2a5298 100%)' }}
        >
          <span className="text-2xl leading-none" role="img" aria-label="Zahn">
            🦷
          </span>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Billing Coach</h1>
            <p className="text-blue-200 text-xs">
              Zahnaerztliche Abrechnungspruefung - Odontathon 2026
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-blue-300 bg-blue-900/40 px-2.5 py-1 rounded-full border border-blue-700">
              GOZ - BEMA
            </span>
          </div>
        </header>

        {/* Tab bar */}
        <div className="px-4 pt-3 max-w-[1440px] mx-auto">
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm w-fit">
            <button
              onClick={() => setActiveTab('session')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'session'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Session
            </button>
            <button
              onClick={() => setActiveTab('abrechnung')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'abrechnung'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Abrechnung
            </button>
          </div>
        </div>

        <main className="p-4 max-w-[1440px] mx-auto">
          {activeTab === 'session' ? (
            <SessionLayout />
          ) : (
            <InvoiceAnalysisPanel />
          )}
        </main>
      </div>
    </QueryClientProvider>
  )
}
