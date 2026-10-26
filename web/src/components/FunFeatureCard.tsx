import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { FunAccent, FunFeatureMeta } from '../lib/fun'
import { cn } from '../lib/utils'
import { FunIconGlyph } from './FunIcon'

const accentBox: Record<FunAccent, string> = {
  saffron: 'bg-saffron-400 text-ink-950 shadow-glow',
  basil: 'bg-basil-400/15 text-basil-400',
  tomato: 'bg-tomato-400/15 text-tomato-400',
}

const accentGlow: Record<FunAccent, string> = {
  saffron: 'from-saffron-400/25',
  basil: 'from-basil-400/20',
  tomato: 'from-tomato-400/20',
}

type FunFeatureCardProps = {
  feature: FunFeatureMeta
  className?: string
}

export function FunFeatureCard({ feature, className }: FunFeatureCardProps) {
  return (
    <Link
      to={feature.path}
      className={cn(
        'surface group relative overflow-hidden p-6 transition hover:border-saffron-400/30 sm:p-7',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-gradient-to-br to-transparent blur-2xl',
          accentGlow[feature.accent],
        )}
      />
      <div className="relative">
        <div className={cn('grid h-12 w-12 place-items-center rounded-2xl', accentBox[feature.accent])}>
          <FunIconGlyph name={feature.icon} size={22} />
        </div>
        <p className="eyebrow mt-5">{feature.eyebrow}</p>
        <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-cream-50">
          {feature.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-cream-300/60">{feature.description}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-saffron-300">
          {feature.action}
          <ArrowRight size={16} className="transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  )
}
