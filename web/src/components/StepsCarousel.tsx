import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  Route,
  Users,
} from 'lucide-react'
import { Button } from './ui/Button'

const slides = [
  {
    id: 'together',
    eyebrow: 'Шаг 1',
    title: 'Соберите комнату и свайпайте',
    text: 'Отправьте друзьям ссылку или короткий код. Каждый свайпает блюда разных ресторанов — в колоде 30 блюд.',
    icon: Users,
    points: [
      'Комната создаётся за пару секунд',
      'Друзья подключаются по ссылке или коду',
      'Вправо — «хочу», влево — «мимо»',
    ],
  },
  {
    id: 'route',
    eyebrow: 'Шаг 2',
    title: 'Ловите мэтчи и идите кушать',
    text: 'Когда вкусы совпали в двух ресторанах, TasteRoute собирает маршрут из 2–3 точек. Остаётся выбрать блюдо и оставить одну бронь на всю компанию.',
    icon: Route,
    points: [
      'Совпадения появляются в реальном времени',
      'Маршрут из 2–3 точек на карте',
      'Одна заявка — с вами свяжутся',
    ],
  },
]

export function StepsCarousel() {
  const [active, setActive] = useState(0)
  const slide = slides[active]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % slides.length)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [])

  const previous = () => setActive((value) => (value - 1 + slides.length) % slides.length)
  const next = () => setActive((value) => (value + 1) % slides.length)

  return (
    <div className="surface overflow-hidden">
      <div className="relative border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/10 via-transparent to-basil-400/[0.07] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">{slide.eyebrow}</p>
          <div className="flex items-center gap-1.5">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Слайд ${index + 1}`}
                aria-current={index === active}
                onClick={() => setActive(index)}
                className={
                  index === active
                    ? 'h-1.5 w-7 rounded-full bg-saffron-400 transition-all'
                    : 'h-1.5 w-2 rounded-full bg-cream-50/20 transition-all hover:bg-cream-50/35'
                }
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-saffron-400/12 text-saffron-300">
              <slide.icon size={26} />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold leading-tight text-cream-50 sm:text-3xl">
                {slide.title}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream-300/60">
                {slide.text}
              </p>
              <ul className="mt-4 space-y-2">
                {slide.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-cream-200/75">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-basil-400/15 text-basil-400">
                      <Check size={10} strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <Button variant="ghost" size="sm" onClick={previous}>
          <ArrowLeft size={15} />
          Назад
        </Button>
        <span className="flex items-center gap-1.5 text-xs text-cream-300/40">
          <CalendarCheck size={13} className="text-saffron-400" />
          {active + 1} / {slides.length}
        </span>
        <Button variant="secondary" size="sm" onClick={next}>
          Дальше
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  )
}
