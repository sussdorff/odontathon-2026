import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useChatStore } from '@/stores/chat-store'

export function CostPanel() {
  const { proposedCodes, costTotal } = useChatStore()

  const gozCount = proposedCodes.filter((c) => c.system === 'GOZ').length
  const bemaCount = proposedCodes.filter((c) => c.system === 'BEMA').length

  return (
    <Card className="flex flex-col">
      <CardHeader className="p-4">
        <CardTitle>Kostenschätzung</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {proposedCodes.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">
            Noch keine Kostenschätzung
          </p>
        ) : (
          <>
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-gray-800">
                {costTotal.toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Geschätzte Gesamtkosten</div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Positionen gesamt</span>
                <span className="font-semibold text-gray-700">{proposedCodes.length}</span>
              </div>
              {gozCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                    GOZ
                  </span>
                  <span className="font-semibold text-gray-700">{gozCount}</span>
                </div>
              )}
              {bemaCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    BEMA
                  </span>
                  <span className="font-semibold text-gray-700">{bemaCount}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
