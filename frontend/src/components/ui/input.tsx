import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ className, label, id, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white',
          'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors',
          'placeholder:text-gray-400',
          className
        )}
        {...props}
      />
    </div>
  )
}
