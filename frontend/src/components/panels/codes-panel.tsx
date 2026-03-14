import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useChatStore } from '@/stores/chat-store'

export function CodesPanel() {
  const { proposedCodes } = useChatStore()

  return (
    <Card className="flex flex-col">
      <CardHeader className="p-4">
        <CardTitle>Vorgeschlagene Codes</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {proposedCodes.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">
            Noch keine Codes vorgeschlagen
          </p>
        ) : (
          proposedCodes.map((item, i) => (
            <div
              key={`${item.code}-${i}`}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                    item.system === 'GOZ'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}
                >
                  {item.system}
                </span>
                <span className="text-sm font-semibold text-gray-800">{item.code}</span>
                {item.estimatedCost != null && (
                  <span className="ml-auto text-xs font-medium text-gray-600">
                    {item.estimatedCost.toLocaleString('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-snug">{item.description}</p>
              {item.teeth && item.teeth.length > 0 && (
                <p className="text-[0.65rem] text-gray-400">
                  Zähne: {item.teeth.join(', ')}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
