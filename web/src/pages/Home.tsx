import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Heart, MapPinned, Route, Sparkles, Store, Users } from 'lucide-react'
import { funFeatures } from '../lib/fun'
import { FunFeatureCard } from '../components/FunFeatureCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function Home() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()

  const join = (event: FormEvent) => {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (normalized.length >= 4) navigate(`/r/${normalized}`)
  }

  return (
    <div className="space-y-16 sm:space-y-24">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Sparkles size={14} />
            Тольятти · групповой гастротур
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-tight text-cream-50 sm:text-6xl lg:text-7xl">
            Соберите маршрут,
            <span className="block text-saffron-300">который устроит всех</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-200/65 sm:text-lg">
            Выберите ресторан по QR или ссылке, соберите компанию и свайпайте меню. Когда вкусы
            совпадут — оставьте бронь. А для гастротура по городу можно собрать маршрут из
            нескольких мест.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate('/places')}>
              Выбрать ресторан
              <ArrowRight size={18} />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/create')}>
              Городская комната
            </Button>
          </div>

          <form onSubmit={join} className="mt-3 flex gap-2">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="Код комнаты"
              maxLength={6}
              aria-label="Код комнаты"
              className="w-40 text-center font-display text-lg tracking-[0.18em] uppercase"
            />
            <Button type="submit" size="lg" variant="secondary" disabled={code.trim().length < 4}>
              Войти
            </Button>
          </form>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-cream-300/45">
            <span className="flex items-center gap-2">
              <Users size={14} className="text-basil-400" /> до 8 человек
            </span>
            <span className="flex items-center gap-2">
              <MapPinned size={14} className="text-saffron-400" /> 20 ресторанов
            </span>
            <span className="flex items-center gap-2">
              <Heart size={14} className="text-tomato-400" /> без установки
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
          <div className="pointer-events-none absolute inset-0 rounded-[3rem] bg-saffron-400/10 blur-3xl" />
          <div className="surface relative overflow-hidden rounded-[2rem] p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Комната ABC234</span>
              <span className="rounded-full bg-basil-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-basil-400">
                4 онлайн
              </span>
            </div>
            <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#4a1616] via-[#a83a2d] to-[#f2b35f] p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Тесто и Огонь
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold leading-tight">Пицца Пепперони</h2>
              <div className="mt-16 flex items-end justify-between">
                <div className="flex gap-2">
                  <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px]">пицца</span>
                  <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px]">хит</span>
                </div>
                <span className="font-display text-2xl font-bold">590 ₽</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-cream-200/10 bg-ink-850 p-3">
              <span className="flex items-center gap-2 text-sm text-cream-200/70">
                <Route size={16} className="text-saffron-400" /> 3 остановки
              </span>
              <span className="text-xs text-cream-300/40">Тольятти</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/places"
          className="surface group flex flex-col justify-between gap-6 p-6 transition hover:border-saffron-400/30 sm:p-7"
        >
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
              <MapPinned size={21} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold text-cream-50">Рестораны города</h2>
            <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
              Выберите место, откройте меню и начните комнату. QR на столе ведёт сюда же.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-300 group-hover:text-saffron-400">
            Смотреть рестораны
            <ArrowRight size={15} />
          </span>
        </Link>
        <Link
          to="/for-restaurants"
          className="surface group flex flex-col justify-between gap-6 p-6 transition hover:border-basil-400/30 sm:p-7"
        >
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-basil-400/10 text-basil-400">
              <Store size={21} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold text-cream-50">Ресторанам</h2>
            <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
              QR-меню, групповой выбор блюд и брони в одном кабинете. Бесплатный пилот.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-basil-400 group-hover:text-basil-300">
            Подключить ресторан
            <ArrowRight size={15} />
          </span>
        </Link>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Гастро-фишки</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">
              Сначала погадай, потом иди есть
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-300/60">
              Четыре лёгкие забавы для разгона аппетита. Узнай свой вкус и сразу преврати результат
              в маршрут с друзьями.
            </p>
          </div>
          <Link
            to="/fun"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-saffron-300 transition hover:text-saffron-400 sm:inline-flex"
          >
            Все фишки
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {funFeatures.map((feature) => (
            <FunFeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
        <Link
          to="/fun"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-300 transition hover:text-saffron-400 sm:hidden"
        >
          Все фишки
          <ArrowRight size={15} />
        </Link>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Как это работает</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">
              Три шага до общего стола
            </h2>
          </div>
          <span className="hidden text-sm text-cream-300/40 sm:block">MVP · без регистрации</span>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: 'Соберите комнату',
              text: 'Отправьте друзьям ссылку или короткий код. Подключаются все — до восьми человек.',
            },
            {
              icon: Heart,
              title: 'Свайпайте вместе',
              text: 'Вправо — хочу попробовать, влево — мимо. Совпадения появляются в реальном времени.',
            },
            {
              icon: Route,
              title: 'Идите по маршруту',
              text: 'TasteRoute соберёт 2–3 точки рядом друг с другом и оставит заявку в ресторан.',
            },
          ].map((step, index) => (
            <div key={step.title} className="surface relative p-6">
              <span className="absolute right-5 top-5 font-display text-4xl font-bold text-cream-50/5">
                0{index + 1}
              </span>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
                <step.icon size={21} />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-cream-50">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream-300/60">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface flex flex-col items-start justify-between gap-6 p-7 sm:flex-row sm:items-center sm:p-9">
        <div>
          <p className="eyebrow">Готовы?</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-cream-50">
            Первый маршрут — за пару минут
          </h2>
          <p className="mt-2 text-sm text-cream-300/60">
            Без аккаунтов, установок и оплаты. Только вкусы вашей компании.
          </p>
        </div>
        <Link
          to="/create"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
        >
          Начать
          <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  )
}
