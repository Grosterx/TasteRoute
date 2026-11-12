import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dices,
  EyeOff,
  Loader2,
  MapPin,
  Route as RouteIcon,
  Send,
  Utensils,
} from 'lucide-react'
import { ApiError, api } from '../lib/api'
import { getSession } from '../lib/session'
import type { DishRef } from '../lib/types'
import { cn } from '../lib/utils'
import { MatchRoulette } from '../components/MatchRoulette'
import { RouteMap } from '../components/RouteMap'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'

const steps = [
  { id: 1, title: 'Карта', icon: MapPin },
  { id: 2, title: 'Блюда', icon: Utensils },
  { id: 3, title: 'Что едим', icon: Dices },
  { id: 4, title: 'Бронь', icon: CalendarCheck },
]

export function RoutePage() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const session = getSession()
  const [step, setStep] = useState(1)
  const [pickedDish, setPickedDish] = useState<DishRef | null>(null)
  const [name, setName] = useState(session?.name ?? '')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)

  const routeQuery = useQuery({
    queryKey: ['route', roomCode],
    queryFn: () => api.route(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
  })

  if (!session || session.roomCode !== roomCode) {
    return <Navigate to={`/r/${roomCode}`} replace />
  }

  const submitLead = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setLeadError(null)
    try {
      const parts: string[] = []
      if (pickedDish) parts.push(`Выбор компании: ${pickedDish.name}`)
      if (comment.trim()) parts.push(comment.trim())
      await api.createLead(session.token, {
        name: name.trim(),
        phone: phone.trim(),
        comment: parts.join('\n'),
      })
      setSent(true)
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Не удалось отправить заявку')
    } finally {
      setBusy(false)
    }
  }

  const conflict = routeQuery.error instanceof ApiError && routeQuery.error.status === 409
  const restaurantRoom =
    routeQuery.error instanceof ApiError && routeQuery.error.message.includes('бронирование')
  const notEnough = conflict && !restaurantRoom

  if (routeQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-cream-300/60">
        <Loader2 size={18} className="animate-spin text-saffron-400" />
        Собираем маршрут…
      </div>
    )
  }

  if (restaurantRoom) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center sm:p-9">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
          <CalendarCheck size={28} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold text-cream-50">Это комната ресторана</h1>
        <p className="mt-3 text-sm leading-relaxed text-cream-300/60">
          Здесь не нужен маршрут по городу: гости выбрали меню одного ресторана. Оставьте бронь с
          общими блюдами.
        </p>
        <Link
          to={`/room/${roomCode}/booking`}
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
        >
          <CalendarCheck size={17} />
          К брони
        </Link>
      </div>
    )
  }

  if (notEnough) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center sm:p-9">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
          <RouteIcon size={28} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold text-cream-50">Нужно больше совпадений</h1>
        <p className="mt-3 text-sm leading-relaxed text-cream-300/60">
          Для маршрута нужны минимум два совпадения в разных ресторанах. Продолжайте свайпать —
          маршрут появится, как только вкусы сойдутся.
        </p>
        <Link
          to={`/room/${roomCode}/swipes`}
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
        >
          Вернуться к свайпам
        </Link>
      </div>
    )
  }

  if (routeQuery.error || !routeQuery.data) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center">
        <h1 className="font-display text-2xl font-bold text-cream-50">Маршрут не собрался</h1>
        <p className="mt-2 text-sm text-cream-300/60">
          {routeQuery.error instanceof Error ? routeQuery.error.message : 'Попробуйте ещё раз'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => routeQuery.refetch()}>
            Повторить
          </Button>
          <Link
            to={`/room/${roomCode}/swipes`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100"
          >
            К свайпам
          </Link>
        </div>
      </div>
    )
  }

  const route = routeQuery.data
  const dishCount = route.stops.reduce((total, stop) => total + stop.dishes.length, 0)
  const routeDishes = route.stops.flatMap((stop) => stop.dishes)
  const mapPoints = route.stops.map((stop) => ({
    id: stop.restaurant_id,
    name: stop.name,
    address: stop.address,
    lat: stop.lat,
    lon: stop.lon,
    dishes: stop.dishes.map((dish) => dish.name),
  }))

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <Link
        to={`/room/${roomCode}`}
        className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
      >
        <ArrowLeft size={16} />
        В комнату
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Маршрут готов</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
            {route.stops.length} остановки,
            <span className="block text-saffron-300">один вкусный вечер</span>
          </h1>
        </div>
        <div className="flex gap-3 text-xs text-cream-300/55">
          <span className="rounded-full border border-cream-200/10 px-3 py-1.5">
            {route.stops.length} ресторана
          </span>
          <span className="rounded-full border border-cream-200/10 px-3 py-1.5">
            {dishCount} блюд
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((item) => {
          const Icon = item.icon
          const active = step === item.id
          const done = item.id < step
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition',
                active
                  ? 'bg-saffron-400 text-ink-950'
                  : done
                    ? 'border border-basil-400/25 bg-basil-400/10 text-basil-400'
                    : 'border border-cream-200/10 text-cream-300/55 hover:text-cream-50',
              )}
            >
              <span
                className={cn(
                  'grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold',
                  active
                    ? 'bg-ink-950/15 text-ink-950'
                    : done
                      ? 'bg-basil-400/15 text-basil-400'
                      : 'bg-cream-50/[0.06] text-cream-300/60',
                )}
              >
                {item.id}
              </span>
              <Icon size={14} />
              <span className="hidden sm:inline">{item.title}</span>
            </button>
          )
        })}
      </div>

      {step === 2 ? (
        <div className="space-y-3">
          {route.stops.map((stop, index) => (
            <div key={stop.restaurant_id} className="surface relative p-5 sm:p-6">
              <div className="flex gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-saffron-400 text-lg font-black text-ink-950">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-display text-2xl font-bold leading-tight text-cream-50">
                      {stop.name}
                    </h2>
                    {index < route.stops.length - 1 ? (
                      <span className="rounded-full bg-basil-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-basil-400">
                        далее
                      </span>
                    ) : (
                      <span className="rounded-full bg-saffron-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-saffron-300">
                        финиш
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-cream-300/50">
                    <MapPin size={13} className="text-saffron-400" />
                    {stop.address}
                  </p>
                  <div className="mt-4 space-y-2">
                    {stop.dishes.map((dish) => (
                      <div
                        key={dish.dish_id}
                        className="flex items-center gap-2 rounded-xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-3 py-2 text-sm text-cream-200/75"
                      >
                        {dish.blind ? (
                          <EyeOff size={13} className="shrink-0 text-saffron-400" />
                        ) : (
                          <Utensils size={13} className="shrink-0 text-saffron-400" />
                        )}
                        <span className="truncate">{dish.name}</span>
                        {dish.blind ? (
                          <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wider text-saffron-300">
                            было вслепую
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <div className="surface p-4 sm:p-5">
            <RouteMap points={mapPoints} connect numbered />
          </div>
          <p className="px-2 text-xs leading-relaxed text-cream-300/35">
            Все точки упорядочены от центра города по кратчайшему расстоянию. Нажмите на маркер,
            чтобы увидеть блюда.
          </p>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="surface p-5 sm:p-6">
              <p className="eyebrow">Что едим</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">Выберите блюдо</h2>
              <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                Ткните в любое совпадение или доверьтесь рулетке. Выбор попадёт в заявку.
              </p>
              <div className="mt-4 space-y-2">
                {routeDishes.map((dish) => {
                  const active = pickedDish?.dish_id === dish.dish_id
                  return (
                    <button
                      key={dish.dish_id}
                      type="button"
                      onClick={() => setPickedDish(dish)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition',
                        active
                          ? 'border-saffron-400/40 bg-saffron-400/[0.08] text-cream-50'
                          : 'border-cream-200/[0.08] bg-cream-50/[0.025] text-cream-200/75 hover:border-saffron-400/25',
                      )}
                    >
                      {dish.blind ? (
                        <EyeOff size={15} className="shrink-0 text-saffron-400" />
                      ) : (
                        <Utensils size={15} className="shrink-0 text-saffron-400" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{dish.name}</span>
                      {active ? (
                        <CheckCircle2 size={16} className="shrink-0 text-saffron-300" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>

            {routeDishes.length >= 2 ? (
              <MatchRoulette dishes={routeDishes} onPick={(dish) => setPickedDish(dish)} />
            ) : null}
          </div>

          {pickedDish ? (
            <div className="rounded-2xl border border-basil-400/20 bg-basil-400/[0.08] px-4 py-3 text-sm text-cream-200/75">
              Выбрано: <span className="font-semibold text-cream-50">{pickedDish.name}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface p-6">
            <p className="eyebrow">Ваш маршрут</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">
              {route.stops.length} остановки
            </h2>
            <ol className="mt-4 space-y-3">
              {route.stops.map((stop, index) => (
                <li key={stop.restaurant_id} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-saffron-400 text-sm font-black text-ink-950">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-cream-100">{stop.name}</p>
                    <p className="text-xs text-cream-300/45">{stop.address}</p>
                    <p className="mt-1 text-xs leading-relaxed text-cream-300/55">
                      {stop.dishes.map((dish) => dish.name).join(' · ')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {pickedDish ? (
              <div className="mt-5 rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.06] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-saffron-300/80">
                  Выбор компании
                </p>
                <p className="mt-1 font-display text-lg font-bold text-cream-50">
                  {pickedDish.name}
                </p>
              </div>
            ) : null}
          </div>

          <div className="surface p-6">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-basil-400/15 text-basil-400">
                  <CheckCircle2 size={28} />
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold text-cream-50">
                  Заявка принята
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                  С вами свяжутся, чтобы подтвердить стол и время. Заявка уже видна в кабинете
                  ресторана.
                </p>
                <Link
                  to={`/room/${roomCode}`}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100"
                >
                  В комнату
                </Link>
              </div>
            ) : (
              <form onSubmit={submitLead} className="space-y-4">
                <div>
                  <p className="eyebrow">Финальный шаг</p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">
                    Забронировать стол
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                    Одна заявка на всю компанию. С вами свяжутся, чтобы подтвердить время и стол.
                  </p>
                </div>
                <div>
                  <label htmlFor="lead-name" className="field-label">
                    Имя
                  </label>
                  <Input
                    id="lead-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lead-phone" className="field-label">
                    Телефон
                  </label>
                  <Input
                    id="lead-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+7 999 000-00-00"
                    maxLength={40}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lead-comment" className="field-label">
                    Комментарий
                  </label>
                  <Textarea
                    id="lead-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Во сколько планируете, сколько вас…"
                    maxLength={500}
                  />
                </div>
                {leadError ? (
                  <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                    {leadError}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  {busy ? 'Отправляем…' : 'Забронировать'}
                </Button>
                <p className="text-center text-xs text-cream-300/35">
                  Это заявка, а не автоматическое подтверждение. С вами свяжутся.
                </p>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          onClick={() => setStep((value) => Math.max(1, value - 1))}
          disabled={step === 1}
        >
          <ChevronLeft size={16} />
          Назад
        </Button>
        {step < 4 ? (
          step === 3 ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setPickedDish(null)
                  setStep(4)
                }}
              >
                Без выбора
              </Button>
              <Button onClick={() => setStep(4)} disabled={!pickedDish}>
                К брони
                <ChevronRight size={16} />
              </Button>
            </div>
          ) : (
            <Button onClick={() => setStep((value) => Math.min(4, value + 1))}>
              Далее
              <ChevronRight size={16} />
            </Button>
          )
        ) : (
          <span className="text-xs text-cream-300/35">Заявка на всю компанию</span>
        )}
      </div>
    </div>
  )
}
