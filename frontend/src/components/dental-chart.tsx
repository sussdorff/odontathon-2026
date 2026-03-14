import { cn } from '@/lib/utils'
import {
  topRightTeeth,
  topLeftTeeth,
  bottomRightTeeth,
  bottomLeftTeeth,
} from '@/data/mock-session'

interface DentalChartProps {
  highlightedTeeth: number[]
  darkTeeth?: number[]
}

export function DentalChart({ highlightedTeeth, darkTeeth = [] }: DentalChartProps) {
  const renderTooth = (num: number) => {
    const isHighlighted = highlightedTeeth.includes(num)
    const isDark = darkTeeth.includes(num)

    return (
      <div key={num} className="flex flex-col items-center gap-1">
        <div
          className={cn(
            'w-5 h-8 rounded border transition-colors duration-300',
            isHighlighted
              ? 'bg-amber-100 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
              : isDark
                ? 'bg-slate-300 border-slate-400'
                : 'bg-white border-slate-200',
          )}
        />
        <span
          className={cn(
            'text-[10px] font-medium font-mono',
            isHighlighted ? 'text-amber-700' : 'text-slate-500',
          )}
        >
          {num}
        </span>
      </div>
    )
  }

  return (
    <div className="w-full bg-slate-50 rounded-xl p-6 border border-slate-100">
      <div className="flex flex-col gap-6 items-center">
        {/* Upper Jaw */}
        <div className="flex gap-1 justify-center">
          <div className="flex gap-1 pr-2 border-r-2 border-slate-200">
            {topRightTeeth.map(renderTooth)}
          </div>
          <div className="flex gap-1 pl-2">{topLeftTeeth.map(renderTooth)}</div>
        </div>

        {/* Lower Jaw */}
        <div className="flex gap-1 justify-center">
          <div className="flex gap-1 pr-2 border-r-2 border-slate-200">
            {bottomRightTeeth.map(renderTooth)}
          </div>
          <div className="flex gap-1 pl-2">{bottomLeftTeeth.map(renderTooth)}</div>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-500"></div>
          <span>Geplante Behandlung</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-300 border border-slate-400"></div>
          <span>Vorerkrankung / Fuellung</span>
        </div>
      </div>
    </div>
  )
}
