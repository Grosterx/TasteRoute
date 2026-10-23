import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-saffron-400 text-ink-950 hover:bg-saffron-300 active:bg-saffron-500 shadow-glow',
  secondary:
    'border border-cream-200/15 bg-cream-50/[0.04] text-cream-100 hover:border-saffron-400/40 hover:bg-cream-50/[0.08]',
  ghost: 'text-cream-200 hover:bg-cream-50/[0.06] hover:text-cream-50',
  danger: 'bg-tomato-500 text-white hover:bg-tomato-400',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 rounded-xl px-3 text-sm',
  md: 'h-11 rounded-2xl px-5 text-sm',
  lg: 'h-12 rounded-2xl px-6 text-base',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
