import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-2xl border border-cream-200/15 bg-ink-900/80 px-4 text-cream-50 placeholder:text-cream-300/40 outline-none transition focus:border-saffron-400/70 focus:ring-2 focus:ring-saffron-400/15',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
