import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-28 w-full resize-y rounded-2xl border border-cream-200/15 bg-ink-900/80 px-4 py-3 text-cream-50 placeholder:text-cream-300/40 outline-none transition focus:border-saffron-400/70 focus:ring-2 focus:ring-saffron-400/15',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
