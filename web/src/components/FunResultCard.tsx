import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Copy, Share2, Sparkles } from 'lucide-react'
import type { FunAccent, FunResult } from '../lib/fun'
import { funCreatePath, funSharePath, funShareText } from '../lib/fun'
import { cn } from '../lib/utils'
import { Button } from './ui/Button'
import { FunIconGlyph } from './FunIcon'

const accents: Record<
  FunAccent,
  { hero: string; icon: string; chip: string; button: string }
> = {
  saffron: {
    hero: 'from-saffron-500/25 via-saffron-400/10 to-transparent',
    icon: 'bg-saffron-400 text-ink-950 shadow-glow',
    chip: 'border-saffron-400/20 bg-saffron-400/10 text-saffron-300',
    button: 'bg-saffron-400 text-ink-950 hover:bg-saffron-300',
  },
  basil: {
    hero: 'from-basil-500/25 via-basil-400/10 to-transparent',
    icon: 'bg-basil-400 text-ink-950',
    chip: 'border-basil-400/20 bg-basil-400/10 text-basil-400',
    button: 'bg-basil-400 text-ink-950 hover:bg-basil-400/90',
  },
  tomato: {
    hero: 'from-tomato-500/25 via-tomato-400/10 to-transparent',
    icon: 'bg-tomato-400 text-ink-950',
    chip: 'border-tomato-400/20 bg-tomato-400/10 text-tomato-400',
    button: 'bg-tomato-400 text-ink-950 hover:bg-tomato-400/90',
  },
}

type FunResultCardProps = {
  result: FunResult
  featureLabel: string
  onRestart?: () => void
  restartLabel?: string
}

type ShareState = 'idle' | 'copied' | 'error'

export function FunResultCard({
  result,
  featureLabel,
  onRestart,
  restartLabel = 'Пройти заново',
}: FunResultCardProps) {
  const [shareState, setShareState] = useState<ShareState>('idle')
  const styles = accents[result.accent]

  const share = async () => {
    const url = `${window.location.origin}${funSharePath(result)}`
    const text = funShareText(result, window.location.origin)

    if (navigator.share) {
      try {
        await navigator.share({ title: result.title, text, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setShareState('copied')
      window.setTimeout(() => setShareState('idle'), 2200)
    } catch {
      setShareState('error')
      window.setTimeout(() => setShareState('idle'), 2200)
    }
  }

  return (
    <div className="surface relative overflow-hidden">
      <div className={cn('relative overflow-hidden border-b border-cream-200/10 bg-gradient-to-br p-7 sm:p-9', styles.hero)}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="relative">
          <p className="eyebrow">{featureLabel}</p>
          <div className="mt-5 flex items-start gap-4">
            <div className={cn('grid h-16 w-16 shrink-0 place-items-center rounded-3xl', styles.icon)}>
              <FunIconGlyph name={result.icon} size={30} />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold leading-tight text-cream-50 sm:text-4xl">
                {result.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-cream-200/70">{result.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-7 sm:p-9">
        <p className="text-sm leading-relaxed text-cream-200/75">{result.description}</p>

        <div className="flex flex-wrap gap-2">
          {result.traits.map((trait) => (
            <span
              key={trait}
              className={cn('rounded-full border px-3 py-1 text-xs font-medium', styles.chip)}
            >
              {trait}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border border-cream-200/10 bg-cream-50/[0.03] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream-300/45">
            С чем сочетается
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-cream-200/75">{result.pairing}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Link
            to={funCreatePath(result)}
            className={cn(
              'inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition',
              styles.button,
            )}
          >
            <Sparkles size={17} />
            Собрать маршрут под этот вайб
            <ArrowRight size={17} />
          </Link>
          <Button variant="secondary" className="h-12" onClick={share}>
            {shareState === 'copied' ? (
              <Check size={17} />
            ) : shareState === 'error' ? (
              <Copy size={17} />
            ) : (
              <Share2 size={17} />
            )}
            {shareState === 'copied'
              ? 'Ссылка скопирована'
              : shareState === 'error'
                ? 'Не удалось'
                : 'Поделиться'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cream-200/10 pt-4">
          {onRestart ? (
            <button
              type="button"
              onClick={onRestart}
              className="text-sm font-medium text-cream-300/55 transition hover:text-cream-50"
            >
              {restartLabel}
            </button>
          ) : (
            <span />
          )}
          <Link
            to="/fun"
            className="text-sm font-medium text-saffron-300 transition hover:text-saffron-400"
          >
            Все гастро-фишки
          </Link>
        </div>
      </div>
    </div>
  )
}
