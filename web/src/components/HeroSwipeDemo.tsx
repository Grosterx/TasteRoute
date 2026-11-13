import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { ArrowLeftRight, ArrowRight, Heart, RotateCcw, Sparkles, Utensils, X } from 'lucide-react'
import { cuisineGradient, formatPrice, tagLabel } from '../lib/utils'
import { Confetti } from './Confetti'

type DemoDish = {
  id: string
  name: string
  restaurant: string
  cuisine: string
  price: number
  tags: string[]
}

const dishes: DemoDish[] = [
  {
    id: 'pepperoni',
    name: 'Пицца Пепперони',
    restaurant: 'Тесто и Огонь',
    cuisine: 'пицца',
    price: 590,
    tags: ['пицца', 'хит'],
  },
  {
    id: 'khinkali',
    name: 'Хинкали',
    restaurant: 'Хинкали и вино',
    cuisine: 'грузинская',
    price: 420,
    tags: ['мясо', 'хит'],
  },
  {
    id: 'sushi-set',
    name: 'Суши-сет',
    restaurant: 'Суши Тайм',
    cuisine: 'азиатская',
    price: 780,
    tags: ['рыба'],
  },
  {
    id: 'carbonara',
    name: 'Паста карбонара',
    restaurant: 'Волга Паста',
    cuisine: 'итальянская',
    price: 490,
    tags: ['паста'],
  },
]

const matchesToWin = 2

type GameStatus = 'idle' | 'matched' | 'done'

export function HeroSwipeDemo() {
  const [index, setIndex] = useState(0)
  const [likes, setLikes] = useState(0)
  const [status, setStatus] = useState<GameStatus>('idle')
  const [interacted, setInteracted] = useState(false)
  const fired = useRef(false)
  const reduceMotion = useReducedMotion()

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-180, 0, 180], [-8, 0, 8])
  const likeOpacity = useTransform(x, [20, 100], [0, 1])
  const skipOpacity = useTransform(x, [-100, -20], [1, 0])

  const current = dishes[index]

  const finish = (liked: boolean) => {
    if (status !== 'idle' || fired.current) return
    fired.current = true
    setInteracted(true)

    animate(x, liked ? 520 : -520, { duration: reduceMotion ? 0 : 0.22 })
    window.setTimeout(
      () => {
        const nextLikes = likes + (liked ? 1 : 0)
        setLikes(nextLikes)
        x.set(0)
        fired.current = false

        if (nextLikes >= matchesToWin) {
          setStatus('matched')
          return
        }
        if (index + 1 >= dishes.length) {
          setStatus('done')
          return
        }
        setIndex(index + 1)
      },
      reduceMotion ? 0 : 180,
    )
  }

  const reset = () => {
    x.set(0)
    fired.current = false
    setIndex(0)
    setLikes(0)
    setStatus('idle')
    setInteracted(false)
  }

  return (
    <div className="surface relative overflow-hidden rounded-[2rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow flex items-center gap-2">
          <Sparkles size={13} className="text-saffron-300" />
          Мини-игра
        </span>
        <span className="rounded-full bg-basil-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-basil-400">
          {status === 'idle' ? 'попробуйте' : 'результат'}
        </span>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status === 'matched'
          ? 'Мэтч! Ваши вкусы совпали. Можно собрать свою комнату.'
          : status === 'done'
            ? 'Колода закончилась без мэтча. Можно попробовать ещё раз.'
            : `Карточка ${index + 1} из ${dishes.length}. Лайков: ${likes}.`}
      </p>

      {status === 'idle' ? (
        <>
          <motion.div
            key={current.id}
            style={{ x, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.9}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100 || info.velocity.x > 600) {
                finish(true)
              } else if (info.offset.x < -100 || info.velocity.x < -600) {
                finish(false)
              } else if (reduceMotion) {
                x.set(0)
              } else {
                animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
              }
            }}
            className="relative mt-4 cursor-grab touch-pan-y select-none active:cursor-grabbing"
          >
            <div
              className={`relative h-[230px] overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${cuisineGradient(
                current.cuisine,
              )} p-5 text-white`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.28),transparent_45%)]" />
              <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/45 to-transparent" />

              <div className="relative flex items-center justify-between gap-3">
                <span className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                  {current.cuisine}
                </span>
                <span className="rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur">
                  демо
                </span>
              </div>

              <div className="absolute inset-x-5 bottom-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  {current.restaurant}
                </p>
                <h2 className="mt-1 font-display text-3xl font-bold leading-tight">{current.name}</h2>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {current.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] backdrop-blur"
                      >
                        {tagLabel(tag)}
                      </span>
                    ))}
                  </div>
                  <span className="shrink-0 font-display text-2xl font-bold">
                    {formatPrice(current.price)}
                  </span>
                </div>
              </div>

              <motion.div
                style={{ opacity: likeOpacity }}
                className="pointer-events-none absolute left-5 top-14 -rotate-12 rounded-xl border-4 border-basil-400 px-3 py-1 text-lg font-black uppercase tracking-widest text-basil-300"
              >
                Хочу
              </motion.div>
              <motion.div
                style={{ opacity: skipOpacity }}
                className="pointer-events-none absolute right-5 top-14 rotate-12 rounded-xl border-4 border-tomato-400 px-3 py-1 text-lg font-black uppercase tracking-widest text-tomato-300"
              >
                Мимо
              </motion.div>
            </div>
          </motion.div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => finish(false)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-cream-200/12 text-sm font-semibold text-cream-200/75 transition hover:border-tomato-400/40 hover:bg-tomato-500/10 hover:text-tomato-400"
            >
              <X size={18} />
              Мимо
            </button>
            <button
              type="button"
              onClick={() => finish(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
            >
              <Heart size={18} />
              Хочу
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-cream-300/45">
            <span>
              Карточка {index + 1} из {dishes.length}
            </span>
            <span className="flex items-center gap-1.5">
              <Heart size={12} className="text-tomato-400" />
              {likes} из {matchesToWin} до мэтча
            </span>
          </div>

          <div className="mt-2 flex h-4 items-center justify-center">
            {!interacted ? (
              <p className="flex items-center gap-1.5 text-[11px] text-cream-300/35">
                <ArrowLeftRight size={12} />
                Потяните карточку влево или вправо
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="relative mt-4 flex min-h-[374px] flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-cream-200/10 bg-gradient-to-br from-basil-500/20 via-ink-850 to-saffron-500/15 p-6 text-center">
          <Confetti active={status === 'matched' && !reduceMotion} count={26} />

          <motion.div
            initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className="grid h-14 w-14 place-items-center rounded-2xl bg-basil-400/15 text-basil-400"
          >
            {status === 'matched' ? <Heart size={26} /> : <Utensils size={26} />}
          </motion.div>

          <p className="eyebrow mt-4">{status === 'matched' ? 'Мэтч' : 'Без мэтча'}</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-cream-50">
            {status === 'matched' ? 'Ваши вкусы совпали' : 'Почти получилось'}
          </h2>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-cream-300/60">
            {status === 'matched'
              ? 'Так работает TasteRoute: друзья свайпают блюда, а совпадения превращаются в маршрут.'
              : 'Вы пролистали всю колоду, но мэтча нет. Попробуйте ещё раз или соберите комнату с друзьями.'}
          </p>

          <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
            <Link
              to="/create"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-5 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
            >
              Собрать свою комнату
              <ArrowRight size={17} />
            </Link>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cream-200/12 text-sm font-semibold text-cream-200/75 transition hover:border-saffron-400/40 hover:text-cream-50"
            >
              <RotateCcw size={15} />
              Ещё раз
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
