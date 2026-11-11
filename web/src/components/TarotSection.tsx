import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Copy, Moon, RotateCcw, Share2, Shuffle, Sparkles } from 'lucide-react'
import type { FunAccent, TarotCard, TarotPositionMeta } from '../lib/fun'
import {
  drawTarotSpread,
  findTarotSpread,
  funCreatePath,
  tarotDateKey,
  tarotPositions,
  tarotSharePath,
  tarotShareText,
} from '../lib/fun'
import { cn } from '../lib/utils'
import { Button } from './ui/Button'
import { FunIconGlyph } from './FunIcon'

type ShareState = 'idle' | 'copied' | 'error'

const accents: Record<
  FunAccent,
  { icon: string; eyebrow: string; border: string; chip: string }
> = {
  saffron: {
    icon: 'bg-saffron-400 text-ink-950',
    eyebrow: 'text-saffron-600',
    border: 'border-saffron-500/45',
    chip: 'border-saffron-400/20 bg-saffron-400/10 text-saffron-300',
  },
  basil: {
    icon: 'bg-basil-400 text-ink-950',
    eyebrow: 'text-basil-500',
    border: 'border-basil-500/45',
    chip: 'border-basil-400/20 bg-basil-400/10 text-basil-400',
  },
  tomato: {
    icon: 'bg-tomato-400 text-ink-950',
    eyebrow: 'text-tomato-500',
    border: 'border-tomato-500/45',
    chip: 'border-tomato-400/20 bg-tomato-400/10 text-tomato-400',
  },
}

function CardBack() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-saffron-400/25 bg-gradient-to-br from-ink-800 via-ink-850 to-ink-950">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-saffron-400/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-tomato-400/10 blur-2xl" />
      <div className="grid h-11 w-11 place-items-center rounded-full border border-saffron-400/35 bg-saffron-400/10 text-saffron-300">
        <Moon size={19} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-cream-200/40" />
        <span className="h-1 w-1 rounded-full bg-cream-200/25" />
        <span className="h-1 w-1 rounded-full bg-cream-200/40" />
      </div>
      <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-cream-200/40">
        TasteRoute
      </p>
    </div>
  )
}

type TarotCardViewProps = {
  card: TarotCard
  positionMeta: TarotPositionMeta
  revealed: boolean
  onReveal: () => void
  index: number
}

function TarotCardView({ card, positionMeta, revealed, onReveal, index }: TarotCardViewProps) {
  const accent = accents[card.accent]

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, rotate: index === 1 ? 0 : index === 0 ? -4 : 4 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: index * 0.12, duration: 0.45, ease: 'easeOut' }}
    >
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-cream-300/45 sm:text-[11px]">
        {positionMeta.label}
      </p>
      <button
        type="button"
        onClick={onReveal}
        className="block w-full outline-none [perspective:1200px]"
        aria-label={revealed ? card.title : `Открыть карту «${positionMeta.label}»`}
      >
        <motion.div
          className="relative aspect-[3/4] w-full [transform-style:preserve-3d]"
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <CardBack />
          </div>
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div
              className={cn(
                'flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-3xl border-2 bg-cream-50 p-2.5 text-center shadow-card',
                accent.border,
              )}
            >
              <div className={cn('grid h-9 w-9 place-items-center rounded-xl', accent.icon)}>
                <FunIconGlyph name={card.icon} size={17} />
              </div>
              <p className={cn('text-[8px] font-bold uppercase tracking-[0.18em]', accent.eyebrow)}>
                {positionMeta.label}
              </p>
              <p className="font-display text-[13px] font-bold leading-tight text-ink-950 sm:text-base">
                {card.title}
              </p>
              <p className="text-[9px] leading-snug text-ink-950/60 sm:text-[11px]">
                {card.subtitle}
              </p>
            </div>
          </div>
        </motion.div>
      </button>
    </motion.div>
  )
}

export function TarotSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hash } = useLocation()
  const sharedSpread = findTarotSpread(searchParams.get('spread'))
  const [cards, setCards] = useState<TarotCard[] | null>(sharedSpread)
  const [revealed, setRevealed] = useState<boolean[]>(
    sharedSpread ? [true, true, true] : [false, false, false],
  )
  const [shuffleCount, setShuffleCount] = useState(0)
  const [shareState, setShareState] = useState<ShareState>('idle')

  useEffect(() => {
    const next = findTarotSpread(searchParams.get('spread'))
    if (next) {
      setCards(next)
      setRevealed([true, true, true])
    }
  }, [searchParams])

  useEffect(() => {
    if (hash === '#tarot' || searchParams.get('spread')) {
      document.getElementById('tarot')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const draw = () => {
    setCards(drawTarotSpread(shuffleCount, tarotDateKey()))
    setRevealed([false, false, false])
  }

  const redraw = () => {
    const nextShuffle = shuffleCount + 1
    setShuffleCount(nextShuffle)
    setCards(drawTarotSpread(nextShuffle, tarotDateKey()))
    setRevealed([false, false, false])
    setSearchParams({}, { replace: true })
  }

  const reveal = (index: number) => {
    setRevealed((prev) => prev.map((value, i) => (i === index ? true : value)))
  }

  const share = async () => {
    if (!cards) return
    const url = `${window.location.origin}${tarotSharePath(cards)}`
    const text = tarotShareText(cards, window.location.origin)

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Расклад на вечер', text, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setShareState('copied')
      window.setTimeout(() => setShareState('idle'), 2200)
    } catch {
      setShareState('error')
      window.setTimeout(() => setShareState('idle'), 2200)
    }
  }

  return (
    <section id="tarot" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Moon size={14} className="text-tomato-400" />
            Гадание на аппетит
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-cream-50 sm:text-4xl">
            Расклад на вечер
            <span className="block text-saffron-300">из трёх карт</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-300/60">
            Перетасуй гастро-колоду прямо здесь и вытяни три карты: аперитив, основное и десерт.
            Расклад меняется каждый день — как аппетит.
          </p>
        </div>
        {cards ? (
          <div className="flex shrink-0 gap-3 text-xs text-cream-300/55">
            <span className="rounded-full border border-cream-200/10 px-3 py-1.5">3 карты</span>
            <span className="rounded-full border border-cream-200/10 px-3 py-1.5">
              {revealed.filter(Boolean).length}/3 открыто
            </span>
          </div>
        ) : null}
      </div>

      {!cards ? (
        <div className="surface relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-tomato-400/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-8 p-7 sm:p-9">
            <div className="relative h-52 w-44">
              <div className="absolute left-4 top-5 h-48 w-36 -rotate-6 opacity-50">
                <CardBack />
              </div>
              <div className="absolute left-2 top-2 h-48 w-36 rotate-3 opacity-70">
                <CardBack />
              </div>
              <motion.div
                className="absolute left-0 top-0 h-48 w-36"
                animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              >
                <CardBack />
              </motion.div>
            </div>
            <Button size="lg" onClick={draw}>
              <Shuffle size={18} />
              Перетасовать и вытянуть
            </Button>
            <p className="text-center text-xs leading-relaxed text-cream-300/40">
              Без регистрации · 30 секунд · результат можно отправить друзьям
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto grid max-w-xl grid-cols-3 gap-3 sm:gap-4">
            {cards.map((card, index) => (
              <TarotCardView
                key={`${shuffleCount}-${card.id}`}
                card={card}
                positionMeta={tarotPositions[index]}
                revealed={revealed[index]}
                onReveal={() => reveal(index)}
                index={index}
              />
            ))}
          </div>

          <div className="space-y-3">
            {cards.map((card, index) => {
              if (!revealed[index]) return null
              const accent = accents[card.accent]
              return (
                <motion.div
                  key={`reading-${card.id}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="surface flex gap-4 p-5 sm:p-6"
                >
                  <div
                    className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', accent.icon)}
                  >
                    <FunIconGlyph name={card.icon} size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream-300/45">
                      {tarotPositions[index].label} · {tarotPositions[index].hint}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-bold text-cream-50">
                      {card.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-cream-200/55">{card.subtitle}</p>
                    <p className="mt-2.5 text-sm leading-relaxed text-cream-200/75">
                      {card.description}
                    </p>
                    <p className="mt-2.5 text-xs leading-relaxed text-cream-300/50">
                      С чем сочетается: {card.pairing}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {card.traits.map((trait) => (
                        <span
                          key={trait}
                          className={cn(
                            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                            accent.chip,
                          )}
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {revealed.every(Boolean) ? (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="surface space-y-5 p-6 sm:p-8"
            >
              <div>
                <p className="eyebrow">Расклад собран</p>
                <h3 className="mt-2 font-display text-2xl font-bold text-cream-50 sm:text-3xl">
                  Вечер предсказан — осталось его прожить
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                  Соберите комнату с этим настроением: друзья свайпают блюда, а совпадения
                  превращаются в общий стол.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Link
                  to={funCreatePath(cards[1])}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-tomato-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-tomato-400/90"
                >
                  <Sparkles size={17} />
                  Собрать комнату под этот вечер
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
                <button
                  type="button"
                  onClick={redraw}
                  className="inline-flex items-center gap-2 text-sm font-medium text-cream-300/55 transition hover:text-cream-50"
                >
                  <RotateCcw size={15} />
                  Вытянуть заново
                </button>
                <span className="text-xs text-cream-300/35">Расклад на {tarotDateKey()}</span>
              </div>
            </motion.div>
          ) : (
            <p className="flex items-center justify-center gap-2 text-center text-xs leading-relaxed text-cream-300/40">
              <Sparkles size={13} className="text-saffron-400" />
              Откройте все три карты, чтобы собрать вечер.
            </p>
          )}
        </>
      )}
    </section>
  )
}
