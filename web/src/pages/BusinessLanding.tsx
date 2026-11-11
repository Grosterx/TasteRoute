import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  PhoneOff,
  QrCode,
  Send,
  Store,
  Target,
  Users,
  Utensils,
} from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'

const steps = [
  {
    icon: QrCode,
    title: 'QR на столе',
    text: 'Гость сканирует код и открывает меню именно вашего ресторана.',
  },
  {
    icon: Users,
    title: 'Компания выбирает',
    text: 'Друзья свайпают блюда. Совпадения собираются в один список.',
  },
  {
    icon: ClipboardList,
    title: 'Бронь приходит вам',
    text: 'Гость оставляет имя, телефон и время. Заявка сразу в кабинете.',
  },
]

const audiences = [
  {
    icon: Store,
    title: 'Самостоятельные рестораны',
    text: 'Владелец или управляющий сам отвечает на брони и хочет перестать терять звонки в час пик.',
  },
  {
    icon: Users,
    title: 'Заведения для компаний',
    text: 'К вам приходят по 3–8 человек: друзья, семьи, коллеги. Важно быстро помочь им договориться.',
  },
  {
    icon: QrCode,
    title: 'Уже есть QR или меню в соцсетях',
    text: 'Гость открывает меню, но дальше нет группового выбора, брони и понятной аналитики.',
  },
  {
    icon: Utensils,
    title: 'Небольшие сети и гастробары',
    text: 'Можно запустить сценарий на каждой точке отдельно и подключить заведение к городскому маршруту.',
  },
]

const situations = [
  {
    icon: Users,
    title: 'Компания не может договориться',
    text: 'В чате 3–6 человек, у всех разные вкусы. Чем дольше выбор, тем выше шанс, что группа вообще никуда не пойдёт.',
  },
  {
    icon: QrCode,
    title: 'QR ведёт только к меню',
    text: 'Гость посмотрел блюда и закрыл страницу: выбрать вместе с друзьями и забронировать стол негде.',
  },
  {
    icon: PhoneOff,
    title: 'Бронь зависит от звонка',
    text: 'В час пик телефон занят, гость не дозвонился и ушёл к конкуренту. Заявка потеряна ещё до разговора.',
  },
  {
    icon: Clock,
    title: 'Запрос приходит не вовремя',
    text: 'Гость пишет вечером или в выходной, а ответа нет. К утру компания уже выбрала другое место.',
  },
]

const gaps = [
  {
    problem: 'Группе сложно выбрать',
    solution: 'Свайпы и общий список совпадений',
    loss: 'Компания уходит туда, где решение принимается быстрее.',
  },
  {
    problem: 'Бронь требует звонка',
    solution: 'Имя, телефон, размер компании и время сразу в кабинете',
    loss: 'Стол на несколько человек и повторный визит достаются конкуренту.',
  },
  {
    problem: 'Персонал занят типовыми вопросами',
    solution: 'Заявки без звонков и переписок',
    loss: 'Время уходит на телефон вместо гостей и сервиса.',
  },
  {
    problem: 'QR-трафик остаётся анонимным',
    solution: 'Аналитика просмотров, комнат, броней и топ блюд',
    loss: 'Нет контакта для повторного касания и данных для решений.',
  },
]

const plans = [
  {
    name: 'Pilot',
    price: '0 ₽',
    note: 'на время запуска',
    features: ['QR-меню', 'Комнаты гостей', 'Брони', 'Базовая аналитика'],
  },
  {
    name: 'Basic',
    price: 'по договорённости',
    note: 'после пилота',
    features: ['Всё из Pilot', 'Источники трафика', 'Топ блюд', 'Поддержка'],
  },
  {
    name: 'Pro',
    price: 'по договорённости',
    note: 'для сети',
    features: ['Отдельный аккаунт на точку', 'Расширенная аналитика', 'Приоритетный запуск'],
  },
]

export function BusinessLanding() {
  const [form, setForm] = useState({
    restaurant_name: '',
    contact_name: '',
    phone: '',
    email: '',
    city: 'Тольятти',
    message: '',
  })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.createSalesLead(form)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-16 sm:space-y-24">
      <section className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Store size={14} />
            TasteRoute для ресторанов
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-tight text-cream-50 sm:text-6xl">
            Гости выбирают вместе,
            <span className="block text-saffron-300">бронь приходит вам.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-200/65 sm:text-lg">
            Бесплатный пилот для самостоятельных ресторанов, кафе и баров Тольятти. Разместите QR
            на столе — компания соберёт общий список блюд, а вы получите готовую заявку на бронь без
            звонков и переписок.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#lead"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-base font-bold text-ink-950 transition hover:bg-saffron-300"
            >
              Попробовать бесплатно
              <ArrowRight size={18} />
            </a>
            <Link
              to="/places"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cream-200/15 bg-cream-50/[0.04] px-6 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
            >
              Посмотреть демо
            </Link>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-cream-300/60 sm:grid-cols-3">
            {['Без комиссии с брони', 'Без нового приложения', 'Запуск за один день'].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-basil-400" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/15 via-transparent to-basil-400/10 p-6 sm:p-8">
            <p className="eyebrow">Что видит гость</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-cream-50">
              Меню, свайпы и бронь в одном сценарии
            </h2>
          </div>
          <div className="grid gap-3 p-6 sm:p-8">
            {[
              ['Волга Паста', 'Паста с томатами', 3],
              ['Волга Паста', 'Салат с burrata', 2],
              ['Волга Паста', 'Тирамису', 4],
            ].map(([place, dish, likes], index) => (
              <div
                key={dish}
                className="flex items-center gap-4 rounded-2xl border border-cream-200/10 bg-cream-50/[0.03] px-4 py-3"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-saffron-400/15 text-sm font-bold text-saffron-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cream-100">{dish}</p>
                  <p className="text-xs text-cream-300/45">{place}</p>
                </div>
                <span className="rounded-full bg-basil-400/10 px-2.5 py-1 text-[11px] font-semibold text-basil-400">
                  {likes} лайка
                </span>
              </div>
            ))}
            <div className="mt-2 rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.06] px-4 py-3 text-sm text-saffron-200/85">
              Компания из 4 человек, сегодня в 19:30. Контакт уже в кабинете.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow">Кому подходит</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-cream-50 sm:text-4xl">
            Ресторанам, где гости приходят компаниями
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-300/60">
            TasteRoute нужен не всем. Мы помогаем заведениям, где важно быстро помочь компании
            выбрать блюда и забронировать стол.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {audiences.map((audience) => (
              <div key={audience.title} className="surface p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-saffron-400/10 text-saffron-300">
                  <audience.icon size={19} />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-cream-50">{audience.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream-300/60">{audience.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface flex flex-col justify-between p-6 sm:p-8">
          <div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-tomato-500/10 text-tomato-400">
              <AlertTriangle size={19} />
            </div>
            <p className="eyebrow mt-5">Не наш клиент на MVP</p>
            <h3 className="mt-3 font-display text-2xl font-bold text-cream-50">Когда лучше подождать</h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-cream-300/60">
              {[
                'Крупные сети с собственной CRM и приложением.',
                'Заведения, где бронь не нужна в принципе.',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tomato-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 border-t border-cream-200/10 pt-4 text-xs leading-relaxed text-cream-300/40">
            Лучше честно сказать «нет», чем продавать пилот, который не решает задачу ресторана.
          </p>
        </div>
      </section>

      <section>
        <div className="max-w-3xl">
          <p className="eyebrow">Когда это нужно</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">
            В момент, когда компания выбирает и бронирует
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-300/60">
            Чем дольше группа не может договориться, тем выше шанс, что она вообще никуда не пойдёт.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {situations.map((situation) => (
            <div key={situation.title} className="surface p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-basil-400/10 text-basil-400">
                  <situation.icon size={18} />
                </div>
                <h3 className="font-display text-lg font-bold text-cream-50">{situation.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-cream-300/60">{situation.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-3xl border border-saffron-400/20 bg-saffron-400/[0.06] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-saffron-400/15 text-saffron-300">
              <Target size={21} />
            </div>
            <div>
              <p className="eyebrow">Задача TasteRoute</p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cream-100/85 sm:text-base">
                Превратить интерес компании в бронь с контактом — без звонка, установки приложения и
                лишней нагрузки на персонал. Гости выбирают вместе, ресторан получает контакт,
                размер компании и время.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-3xl">
          <p className="eyebrow">Проблема → решение → потеря</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">
            Что ломается без TasteRoute
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-300/60">
            Пассивное QR-меню показывает блюда, но не помогает выбрать и не приводит к брони. Мы
            закрываем разрыв между «посмотрел меню» и «забронировал стол».
          </p>
        </div>
        <div className="mt-8 hidden grid-cols-[1fr_1.15fr_0.95fr] gap-4 px-5 text-[10px] font-bold uppercase tracking-[0.18em] text-cream-300/35 md:grid">
          <span>Проблема</span>
          <span>Решение TasteRoute</span>
          <span>Без TasteRoute</span>
        </div>
        <div className="mt-2 space-y-3 md:mt-0">
          {gaps.map((gap) => (
            <div
              key={gap.problem}
              className="surface grid gap-4 p-5 md:grid-cols-[1fr_1.15fr_0.95fr] md:items-center"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-tomato-400 md:hidden">
                  Проблема
                </span>
                <p className="mt-1 font-semibold text-cream-50 md:mt-0">{gap.problem}</p>
              </div>
              <div className="rounded-2xl border border-basil-400/15 bg-basil-400/[0.06] px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-basil-400">
                  TasteRoute
                </span>
                <p className="mt-1 text-sm leading-relaxed text-cream-200/75">{gap.solution}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-tomato-400 md:hidden">
                  Без TasteRoute
                </span>
                <p className="mt-1 text-sm leading-relaxed text-cream-300/55">{gap.loss}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-cream-200/10 bg-ink-850 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="max-w-2xl text-sm leading-relaxed text-cream-200/70">
            Одна потерянная группа — это не один чек, а стол на несколько человек, повторный визит и
            рекомендация.
          </p>
          <a
            href="#lead"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-5 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
          >
            Проверить на своём ресторане
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <section>
        <p className="eyebrow">Как это работает</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-cream-50 sm:text-4xl">
          Три шага от QR до брони
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
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

      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Тарифы</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">
              Начните с бесплатного пилота
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-300/60">
              На запуске подключаем вручную и бесплатно. Оплату и расширенные тарифы обсудим
              после того, как вы увидите первые брони.
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="surface flex flex-col p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-300">
                {plan.name}
              </p>
              <p className="mt-4 font-display text-3xl font-bold text-cream-50">{plan.price}</p>
              <p className="mt-1 text-xs text-cream-300/45">{plan.note}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-cream-200/70">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-basil-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#lead"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 bg-cream-50/[0.04] px-5 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
              >
                Обсудить запуск
              </a>
            </div>
          ))}
        </div>
      </section>

      <section id="lead" className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="eyebrow">Заявка на пилот</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50">
            Подключим ваш ресторан
            <span className="block text-saffron-300">за один день</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-cream-300/60">
            Оставьте контакты — свяжемся, создадим кабинет, добавим меню и поможем с QR для столов.
            Никаких платежей на этом этапе.
          </p>
          <div className="mt-6 space-y-3 text-sm text-cream-300/60">
            <p className="flex items-center gap-2">
              <BarChart3 size={16} className="text-saffron-400" />
              Видно просмотры, комнаты, брони и топ блюд
            </p>
            <p className="flex items-center gap-2">
              <QrCode size={16} className="text-saffron-400" />
              QR генерируется в кабинете
            </p>
            <p className="flex items-center gap-2">
              <Send size={16} className="text-saffron-400" />
              Заявки приходят без email и Telegram
            </p>
          </div>
        </div>

        <div className="surface p-6 sm:p-8">
          {sent ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-basil-400/15 text-basil-400">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold text-cream-50">Заявка отправлена</h3>
              <p className="mt-2 text-sm text-cream-300/60">
                Мы сохранили контакты. Администратор увидит заявку и свяжется с вами.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-restaurant" className="field-label">
                    Ресторан
                  </label>
                  <Input
                    id="lead-restaurant"
                    value={form.restaurant_name}
                    onChange={(event) => setForm({ ...form, restaurant_name: event.target.value })}
                    placeholder="Название"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lead-contact" className="field-label">
                    Ваше имя
                  </label>
                  <Input
                    id="lead-contact"
                    value={form.contact_name}
                    onChange={(event) => setForm({ ...form, contact_name: event.target.value })}
                    placeholder="Как к вам обращаться"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-phone" className="field-label">
                    Телефон
                  </label>
                  <Input
                    id="lead-phone"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="+7 999 000-00-00"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lead-email" className="field-label">
                    Email
                  </label>
                  <Input
                    id="lead-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="optional@example.ru"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lead-city" className="field-label">
                  Город
                </label>
                <Input
                  id="lead-city"
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor="lead-message" className="field-label">
                  Комментарий
                </label>
                <Textarea
                  id="lead-message"
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  placeholder="Сколько точек, что хотите проверить…"
                  maxLength={1000}
                />
              </div>
              {error ? (
                <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {busy ? 'Отправляем…' : 'Отправить заявку'}
              </Button>
              <p className="text-center text-xs text-cream-300/35">
                Уже подключены? <Link to="/restaurant/login" className="text-saffron-300">Войти в кабинет</Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
