import { ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { usePracticeRules } from '@/lib/queries/use-practice-rules'
import { cn } from '@/lib/utils'

const categoryColors: Record<string, string> = {
  ZE:     'bg-purple-100 text-purple-700 border-purple-200',
  KCH:    'bg-blue-100 text-blue-700 border-blue-200',
  PA:     'bg-teal-100 text-teal-700 border-teal-200',
  KFO:    'bg-orange-100 text-orange-700 border-orange-200',
  default:'bg-gray-100 text-gray-600 border-gray-200',
}

export function RulesPanel() {
  const { data, isLoading } = usePracticeRules()
  const rules = data?.rules ?? []
  const enabledCount = rules.filter((r) => r.enabled).length

  return (
    <Card className="p-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Praxisregeln</CardTitle>
          {rules.length > 0 && (
            <span className="text-xs text-gray-400 font-normal">
              {enabledCount}/{rules.length} aktiv
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
            <ShieldCheck size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Keine Praxisregeln definiert.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  'flex gap-3 items-center p-3 rounded-lg border transition-colors',
                  rule.enabled
                    ? 'bg-white border-gray-200 hover:bg-gray-50'
                    : 'bg-gray-50 border-gray-100 opacity-60'
                )}
              >
                {rule.enabled ? (
                  <ToggleRight size={18} className="shrink-0 text-green-500" />
                ) : (
                  <ToggleLeft size={18} className="shrink-0 text-gray-400" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800">{rule.name}</div>
                  <div className="text-xs text-gray-500 truncate">{rule.description}</div>
                </div>
                <span
                  className={cn(
                    'text-[0.65rem] px-2 py-0.5 rounded-full font-medium border shrink-0',
                    categoryColors[rule.category] || categoryColors.default
                  )}
                >
                  {rule.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
