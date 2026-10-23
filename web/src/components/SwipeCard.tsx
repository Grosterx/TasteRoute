import { useRef } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Heart, MapPin, X } from 'lucide-react'
import type { Dish } from '../lib/types'
import { cuisineGradient, formatPrice, tagLabel } from '../lib/utils'

type SwipeCardProps = {
  dish: Dish
  onSwipe: (liked: boolean) => boolean
  disabled?: boolean
}

export function SwipeCard({ dish, onSwipe, disabled = false }: SwipeCardProps) {
  const x = useMotionValue(0)
  const fired = useRef(false)
  const rotate = useTransform(x, [-220, 0, 220], [-9, 0, 9])
  const likeOpacity = useTransform(x, [20, 120], [0, 1])
  const skipOpacity = useTransform(x, [-120, -20], [1, 0])

  const finish = (liked: boolean) => {
    if (disabled || fired.current) return
    fired.current = true
    animate(x, liked ? 520 : -520, { duration: 0.24 })
    window.setTimeout(() => {
      const accepted = onSwipe(liked)
      if (!accepted) {
        fired.current = false
        animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
      }
    }, 180)
  }

  return (
    <motion.div
      key={dish.dish_id}
      style={{ x, rotate }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x > 110 || info.velocity.x > 600) {
          finish(true)
        } else if (info.offset.x < -110 || info.velocity.x < -600) {
          finish(false)
        } else {
          animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
        }
      }}
      className="relative mx-auto w-full max-w-[430px] cursor-grab touch-pan-y select-none active:cursor-grabbing"
    >
      <div className="surface grain relative overflow-hidden rounded-[2rem]">
        <div className={`relative h-[270px] bg-gradient-to-br ${cuisineGradient(dish.restaurant_cuisine)}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.28),transparent_40%)]" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-ink-900 via-ink-900/30 to-transparent" />
          <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {dish.restaurant_cuisine}
          </div>
          <div className="absolute bottom-5 left-5 right-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
              {dish.restaurant_name}
            </p>
            <h2 className="mt-1 font-display text-4xl font-bold leading-tight text-white">
              {dish.name}
            </h2>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <p className="min-h-10 text-sm leading-relaxed text-cream-200/75">{dish.description}</p>

          <div className="flex flex-wrap gap-2">
            {dish.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-cream-200/10 bg-cream-50/[0.04] px-2.5 py-1 text-[11px] font-medium text-cream-200/70"
              >
                {tagLabel(tag)}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-cream-200/10 pt-4">
            <div className="flex min-w-0 items-center gap-2 text-xs text-cream-300/55">
              <MapPin size={14} className="shrink-0 text-saffron-400" />
              <span className="truncate">{dish.restaurant_address}</span>
            </div>
            <span className="shrink-0 font-display text-2xl font-bold text-saffron-300">
              {formatPrice(dish.price)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => finish(false)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-cream-200/12 text-sm font-semibold text-cream-200/75 transition hover:border-tomato-400/40 hover:bg-tomato-500/10 hover:text-tomato-400 disabled:opacity-40"
            >
              <X size={18} />
              Пропустить
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => finish(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 text-sm font-bold text-ink-950 transition hover:bg-saffron-300 disabled:opacity-40"
            >
              <Heart size={18} />
              Хочу
            </button>
          </div>
        </div>

        <motion.div
          style={{ opacity: likeOpacity }}
          className="pointer-events-none absolute left-6 top-6 -rotate-12 rounded-xl border-4 border-basil-400 px-3 py-1 text-xl font-black uppercase tracking-widest text-basil-400"
        >
          Хочу
        </motion.div>
        <motion.div
          style={{ opacity: skipOpacity }}
          className="pointer-events-none absolute right-6 top-6 rotate-12 rounded-xl border-4 border-tomato-400 px-3 py-1 text-xl font-black uppercase tracking-widest text-tomato-400"
        >
          Мимо
        </motion.div>
      </div>
    </motion.div>
  )
}
