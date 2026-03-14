import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InputPanel } from '@/components/panels/input-panel'
import { ProgressPanel } from '@/components/panels/progress-panel'
import { ReportPanel } from '@/components/panels/report-panel'
import { RulesPanel } from '@/components/panels/rules-panel'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#f0f2f5]">
        <header
          className="px-8 py-3.5 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2a5298 100%)' }}
        >
          <span className="text-2xl leading-none" role="img" aria-label="Zahn">🦷</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Billing Coach</h1>
            <p className="text-blue-200 text-xs">Zahnaerztliche Abrechnungspruefung · Odontathon 2026</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-blue-300 bg-blue-900/40 px-2.5 py-1 rounded-full border border-blue-700">
              GOZ · BEMA
            </span>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 max-w-[1440px] mx-auto">
          <InputPanel />
          <div className="space-y-4">
            <ProgressPanel />
            <ReportPanel />
            <RulesPanel />
          </div>
        </main>
      </div>
    </QueryClientProvider>
  )
}
