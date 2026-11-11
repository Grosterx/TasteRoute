import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Route, Sparkles, Users } from 'lucide-react'
import { funFeatures } from '../lib/fun'
import { FunFeatureCard } from '../components/FunFeatureCard'
import { PairCompatibility } from '../components/PairCompatibility'
import { TarotSection } from '../components/TarotSection'

// таро и тест на двоих живут прямо на этой странице, поэтому карточки-ссылки для них не показываем
const linkFeatures = funFeatures.filter(
  (feature) => feature.id !== 'tarot' && feature.id !== 'pair',
)

export function FunHub() {
  return (
    <div className="mx-auto max-w-4xl space-y-9">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
      >
        <ArrowLeft size={16} />
        На главную
      </Link>

      <div>
        <p className="eyebrow flex items-center gap-2">
          <Sparkles size={14} />
          Гастро-фишки
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
          Сначала погадай,
          <span className="block text-saffron-300">потом иди есть</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cream-300/60 sm:text-base">
          Четыре лёгкие забавы для разгона аппетита. Узнай свой гастро-характер и сразу преврати
          результат в маршрут, который устроит всю компанию.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {linkFeatures.map((feature) => (
          <FunFeatureCard key={feature.id} feature={feature} />
        ))}
      </div>

      <TarotSection />

      <PairCompatibility />

      <div className="surface grid gap-6 p-7 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div>
          <p className="eyebrow">Дальше — маршрут</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-cream-50 sm:text-3xl">
            Результат легко превратить в общий вечер
          </h2>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-cream-300/55">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-basil-400" />
              Позови друзей по ссылке
            </span>
            <span className="flex items-center gap-1.5">
              <Route size={14} className="text-saffron-400" />
              Свайпните блюда вместе
            </span>
          </div>
        </div>
        <Link
          to="/create"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
        >
          Создать комнату
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  )
}
