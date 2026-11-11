import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dices, RotateCcw, Sparkles, Utensils } from 'lucide-react'
import { hashString } from '../lib/fun'
import { Button } from './ui/Button'
import { Confetti } from './Confetti'

export type RouletteDish = {
  dish_id: string
  name: string
}

type MatchRouletteProps = {
  dishes: RouletteDish[]
}

const WHEEL_SIZE = 268
const LABEL_RADIUS = 98
const SEGMENT_COLORS = ['#211c17', '#332b23']

export function MatchRoulette({ dishes }: MatchRouletteProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [pending, setPending] = useState<number | null>(null)
  const [winner, setWinner] = useState<number | null>(null)
  const [round, setRound] = useState(0)

  const segment = 360 / dishes.length
  const gradient = `conic-gradient(${dishes
    .map(
      (_, index) =>
        `${SEGMENT_COLORS[index % SEGMENT_COLORS.length]} ${index * segment}deg ${(index + 1) * segment}deg`,
    )
    .join(', ')})`

  const spin = () => {
    if (spinning || dishes.length < 2) return
    const seed = hashString(`${round}:${dishes.map((dish) => dish.dish_id).join('|')}`)
    const winnerIndex = seed % dishes.length
    const center = (winnerIndex + 0.5) * segment
    const base = rotation + 1440
    const current = ((base % 360) + 360) % 360
    const correction = (((-center - current) % 360) + 360) % 360
    setWinner(null)
    setPending(winnerIndex)
    setSpinning(true)
    setRound((value) => value + 1)
    setRotation(base + correction)
  }

  const handleComplete = () => {
    if (pending === null) return
    setSpinning(false)
    setWinner(pending)
  }

  const winnerDish = winner !== null ? dishes[winner] : null

  return (
    <div className="surface overflow-hidden">
      <div className="relative border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/12 via-transparent to-basil-400/10 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-saffron-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Dices size={14} className="text-saffron-300" />
              Рулетка мэтчей
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold text-cream-50 sm:text-3xl">
              Спорите, что заказать?
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-cream-300/60">
              Пусть решит колесо: крутаните — и оно выберет одно блюдо из совпавших.
            </p>
          </div>
          <span className="text-xs text-cream-300/40">{dishes.length} блюда в игре</span>
        </div>
      </div>

      <div className="relative p-6 sm:p-8">
        <div className="relative mx-auto" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
            <div className="h-0 w-0 border-x-[11px] border-t-[18px] border-x-transparent border-t-saffron-400 drop-shadow-lg" />
          </div>
          <motion.div
            className="relative h-full w-full rounded-full border-4 border-cream-200/15 shadow-card"
            style={{ background: gradient }}
            animate={{ rotate: rotation }}
            transition={{ duration: 3.6, ease: [0.15, 0.75, 0.05, 1] }}
            onAnimationComplete={handleComplete}
          >
            {dishes.map((dish, index) => {
              const angle = (index + 0.5) * segment
              return (
                <span
                  key={dish.dish_id}
                  className="absolute left-1/2 top-1/2 grid h-7 w-7 place-items-center rounded-full border border-cream-200/20 bg-ink-950/90 text-[11px] font-bold text-cream-100"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${LABEL_RADIUS}px) rotate(${-angle}deg)`,
                  }}
                >
                  {index + 1}
                </span>
              )
            })}
          </motion.div>
          {winnerDish ? <Confetti active count={20} /> : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-cream-300/55">
          {dishes.map((dish, index) => (
            <span
              key={dish.dish_id}
              className={index === winner ? 'font-semibold text-saffron-300' : undefined}
            >
              {index + 1}. {dish.name}
            </span>
          ))}
        </div>

        <div className="mt-6">
          {winnerDish ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative flex items-center gap-4 rounded-2xl border border-saffron-400/25 bg-saffron-400/[0.07] px-5 py-4"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-saffron-400 text-ink-950">
                <Utensils size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-saffron-300/80">
                  Колесо решило
                </p>
                <p className="mt-0.5 font-display text-xl font-bold leading-tight text-cream-50">
                  {winnerDish.name}
                </p>
              </div>
            </motion.div>
          ) : null}

          <Button
            size="lg"
            className="mt-4 w-full"
            onClick={spin}
            disabled={spinning || dishes.length < 2}
          >
            {spinning ? (
              <>
                <Dices size={18} className="animate-spin" />
                Крутим…
              </>
            ) : winnerDish ? (
              <>
                <RotateCcw size={18} />
                Крутить ещё раз
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Крутить рулетку
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
