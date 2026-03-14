import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin',
        className
      )}
    />
  )
}
