import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Flame, MapPin } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { cn, cuisineGradient, formatPrice } from '../lib/utils'

type ShowcaseSlide = {
  id: string
  name: string
  restaurant: string
  slug: string
  cuisine: string
  price: number
  note: string
  image: string
  emoji: string
  credit: { author: string; href: string }
}

const slides: ShowcaseSlide[] = [
  {
    id: 'pizza',
    name: 'Пицца Пепперони',
    restaurant: 'Тесто и Огонь',
    slug: 'testo-i-ogon',
    cuisine: 'пицца',
    price: 590,
    note: 'Тонкое тесто и тянущийся сыр',
    image: '/hero/pizza.jpg',
    emoji: '🍕',
    credit: {
      author: 'Pogrebnoj-Alexandroff',
      href: 'https://commons.wikimedia.org/wiki/File:Pepperoni_pizza_2.jpg',
    },
  },
  {
    id: 'pasta',
    name: 'Паста карбонара',
    restaurant: 'Волга Паста',
    slug: 'volga-pasta',
    cuisine: 'итальянская',
    price: 490,
    note: 'Сливочный соус и хрустящий бекон',
    image: '/hero/pasta.jpg',
    emoji: '🍝',
    credit: {
      author: 'Javier Somoza',
      href: 'https://commons.wikimedia.org/wiki/File:Espaguetis_carbonara.jpg',
    },
  },
  {
    id: 'khinkali',
    name: 'Хинкали',
    restaurant: 'Хинкали и вино',
    slug: 'hinkali-i-vino',
    cuisine: 'грузинская',
    price: 420,
    note: 'Сочная начинка и перец',
    image: '/hero/khinkali.jpg',
    emoji: '🥟',
    credit: {
      author: 'MIKHEIL',
      href: 'https://commons.wikimedia.org/wiki/File:Khinkali_551.jpg',
    },
  },
  {
    id: 'sushi',
    name: 'Суши-сет',
    restaurant: 'Суши Тайм',
    slug: 'sushi-time',
    cuisine: 'азиатская',
    price: 780,
    note: 'Свежая рыба и рис',
    image: '/hero/sushi.jpg',
    emoji: '🍣',
    credit: {
      author: 'Songshu888',
      href: 'https://commons.wikimedia.org/wiki/File:Sushi_set,_Tokyo_Japan_(2010-09-14_by_Songshu888_@Pixabay_2091357).jpg',
    },
  },
]

export function HeroTasteShowcase() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion || paused) return
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, 5200)
    return () => window.clearTimeout(timer)
  }, [index, paused, reduceMotion])

  const active = slides[index]
  const go = (step: number) => setIndex((current) => (current + step + slides.length) % slides.length)

  return (
    <div
      className="surface relative overflow-hidden rounded-[2rem] p-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow flex items-center gap-2">
          <Flame size={13} className="text-tomato-400" />
          Вкус дня
        </span>
        <span className="rounded-full bg-saffron-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-saffron-300">
          демо-меню
        </span>
      </div>

      <div className="relative mt-4 h-[240px] overflow-hidden rounded-[1.5rem] bg-ink-850">
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index
          return (
            <div
              key={slide.id}
              className={cn(
                'absolute inset-0 transition-opacity duration-500',
                isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-hidden={!isActive}
            >
              <div className={cn('absolute inset-0 bg-gradient-to-br', cuisineGradient(slide.cuisine))} />
              <div className="absolute inset-0 grid place-items-center text-7xl opacity-25">{slide.emoji}</div>

              {!failed[slide.id] ? (
                <img
                  src={slide.image}
                  alt={`${slide.name} — ${slide.restaurant}`}
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  onError={() => setFailed((current) => ({ ...current, [slide.id]: true }))}
                  className={cn(
                    'absolute inset-0 h-full w-full object-cover transition duration-700 ease-out',
                    isActive ? 'scale-100 opacity-100' : 'scale-105 opacity-0',
                  )}
                />
              ) : null}

              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/25 to-transparent" />

              <div className="absolute inset-x-5 bottom-5 text-cream-50">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cream-200/80">
                  <MapPin size={12} />
                  {slide.restaurant}
                </p>
                <h2 className="mt-1 font-display text-3xl font-bold leading-tight drop-shadow">{slide.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                    {slide.cuisine}
                  </span>
                  <span className="text-xs text-cream-200/75">{slide.note}</span>
                </div>
              </div>

              <span className="absolute right-4 top-4 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold tabular-nums text-cream-100 backdrop-blur">
                {String(slideIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
            </div>
          )
        })}

        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Предыдущее блюдо"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/35 text-cream-50 backdrop-blur transition hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-saffron-300"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Следующее блюдо"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/35 text-cream-50 backdrop-blur transition hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-saffron-300"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {active.name}, {active.restaurant}, {formatPrice(active.price)}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Блюда витрины">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={slideIndex === index}
              aria-label={`${slide.name} — ${slide.restaurant}`}
              onClick={() => setIndex(slideIndex)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                slideIndex === index ? 'w-7 bg-saffron-400' : 'w-2.5 bg-cream-200/20 hover:bg-cream-200/40',
              )}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-saffron-300">{formatPrice(active.price)}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Link
          to={`/places/${active.slug}`}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-4 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
        >
          Смотреть меню
          <ArrowRight size={17} />
        </Link>
        <Link
          to="/places"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-cream-200/12 px-4 text-sm font-semibold text-cream-200/75 transition hover:border-saffron-400/40 hover:text-cream-50"
        >
          Все рестораны
        </Link>
      </div>

      <p className="mt-3 text-center text-[10px] text-cream-300/30">
        Фото:{' '}
        <a
          href={active.credit.href}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-cream-300/20 underline-offset-2 transition hover:text-cream-300/60"
        >
          {active.credit.author}
        </a>{' '}
        · Wikimedia Commons
      </p>
    </div>
  )
}
