import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gkv' | 'pkv' | 'outline'
}

const variants = {
  default: 'bg-accent text-accent-foreground',
  gkv: 'bg-gkv text-gkv-foreground',
  pkv: 'bg-pkv text-pkv-foreground',
  outline: 'border border-input text-muted-foreground',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
