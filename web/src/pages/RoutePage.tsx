import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dices,
  EyeOff,
  Footprints,
  Loader2,
  MapPin,
  RefreshCw,
  Route as RouteIcon,
  Send,
  Car,
  Bus,
  Utensils,
} from 'lucide-react'
import { ApiError, api } from '../lib/api'
import { getSession } from '../lib/session'
import { bookingStatusLabel, isActiveBookingStatus } from '../lib/restaurant'
import type { DishRef, Stop } from '../lib/types'
import {
  defaultTravelMode,
  dwellMinutes,
  formatDistance,
  formatMinutes,
  legMinutes,
  localDatetimeValue,
  nextHalfHour,
  suggestStopTimes,
  totalMinutes,
  travelModes,
  type TravelMode,
} from '../lib/travel'
import { cn } from '../lib/utils'
import { MatchRoulette } from '../components/MatchRoulette'
import { RouteMap } from '../components/RouteMap'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'

const steps = [
  { id: 1, title: 'Блюда', icon: Utensils },
  { id: 2, title: 'Карта', icon: MapPin },
  { id: 3, title: 'Что едим', icon: Dices },
  { id: 4, title: 'Бронь', icon: CalendarCheck },
]

const modeIcons: Record<TravelMode, typeof Footprints> = {
  walk: Footprints,
  taxi: Car,
  drive: Car,
  transit: Bus,
}

export function RoutePage() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const session = getSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [selection, setSelection] = useState<Record<string, string[]>>({})
  const [name, setName] = useState(session?.name ?? '')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [partySize, setPartySize] = useState(0)
  const [mode, setMode] = useState<TravelMode | null>(null)
  const [startAt, setStartAt] = useState(() => localDatetimeValue(nextHalfHour()))
  const [manualTimes, setManualTimes] = useState<Record<number, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const routeQuery = useQuery({
    queryKey: ['route', roomCode],
    queryFn: () => api.route(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
  })
  const summaryQuery = useQuery({
    queryKey: ['room-summary', roomCode],
    queryFn: () => api.roomSummary(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
    refetchInterval: 10_000,
  })

  const refreshRoute = useMutation({
    mutationFn: () => api.route(roomCode, session!.token, true),
    onSuccess: (fresh) => {
      queryClient.setQueryData(['route', roomCode], fresh)
      setSelection({})
      setManualTimes({})
      queryClient.invalidateQueries({ queryKey: ['room-summary', roomCode] })
    },
  })

  const chainMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.createChain>[1]) =>
      api.createChain(session!.token, payload),
    onSuccess: (created) => {
      queryClient.setQueryData(['room-summary', roomCode], (current: unknown) =>
        current && typeof current === 'object' ? { ...current, chain: created } : current,
      )
      queryClient.invalidateQueries({ queryKey: ['room-summary', roomCode] })
      navigate(`/room/${roomCode}/evening`)
    },
  })

  if (!session || session.roomCode !== roomCode) {
    return <Navigate to={`/r/${roomCode}`} replace />
  }

  const chain = summaryQuery.data?.chain ?? null
  const singleBooking = summaryQuery.data?.booking ?? null
  const activeChain = Boolean(chain && isActiveBookingStatus(chain.status))
  const activeSingleBooking = Boolean(singleBooking && isActiveBookingStatus(singleBooking.status))

  if (activeChain && chain) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center sm:p-9">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-basil-400/15 text-basil-400">
          <RouteIcon size={28} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold text-cream-50">Вечер уже собран</h1>
        <p className="mt-3 text-sm leading-relaxed text-cream-300/60">
          Компания забронировала {chain.stops.length} точки маршрута. Статусы подтверждений и замену
          отказавших точек можно посмотреть на экране вечера.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={`/room/${roomCode}/evening`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
          >
            <CalendarCheck size={17} />
            К вечеру
          </Link>
          <Link
            to={`/room/${roomCode}`}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-cream-200/15 px-6 text-sm font-semibold text-cream-100"
          >
            В комнату
          </Link>
        </div>
      </div>
    )
  }

  if (activeSingleBooking && singleBooking) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center sm:p-9">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
          <CalendarCheck size={28} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold text-cream-50">
          У компании уже есть бронь
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-cream-300/60">
          Сейчас забронирован один ресторан, статус — {bookingStatusLabel(singleBooking.status)}.
          Чтобы собрать вечер из нескольких точек, сначала отмените эту бронь.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={`/room/${roomCode}/choice`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
          >
            <CalendarCheck size={17} />
            К брони
          </Link>
          <Link
            to={`/room/${roomCode}`}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-cream-200/15 px-6 text-sm font-semibold text-cream-100"
          >
            В комнату
          </Link>
        </div>
      </div>
    )
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
  const participants = summaryQuery.data?.room.participants_count ?? 1
  const partyDefault = partySize || participants || 1
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

  const dishIDsFor = (stop: Stop) =>
    selection[stop.restaurant_id] ?? stop.dishes.map((dish) => dish.dish_id)

  const toggleDish = (stop: Stop, dish: DishRef) => {
    const current = dishIDsFor(stop)
    setSelection((value) => ({
      ...value,
      [stop.restaurant_id]: current.includes(dish.dish_id)
        ? current.filter((id) => id !== dish.dish_id)
        : [...current, dish.dish_id],
    }))
  }

  const applyRoulette = (dish: DishRef) => {
    const stop = route.stops.find((item) => item.dishes.some((entry) => entry.dish_id === dish.dish_id))
    if (!stop) return
    const current = dishIDsFor(stop)
    setSelection((value) => ({
      ...value,
      [stop.restaurant_id]: current.includes(dish.dish_id)
        ? current
        : [...current, dish.dish_id],
    }))
  }

  const pickDish = (dish: DishRef) => {
    const stop = route.stops.find((item) => item.dishes.some((entry) => entry.dish_id === dish.dish_id))
    if (!stop) return
    setSelection((value) => ({ ...value, [stop.restaurant_id]: [dish.dish_id] }))
  }

  const travelMode = mode || defaultTravelMode(route.legs)
  const startDate = new Date(startAt)
  const start = Number.isNaN(startDate.getTime()) ? nextHalfHour() : startDate
  const autoTimes = suggestStopTimes(route.legs, travelMode, start)
  const timeValue = (index: number) => {
    if (index === 0) return startAt
    return manualTimes[index] ?? localDatetimeValue(autoTimes[index] ?? start)
  }

  const changeMode = (next: TravelMode) => {
    setMode(next)
    setManualTimes({})
  }

  const changeStart = (value: string) => {
    setStartAt(value)
    setManualTimes({})
  }

  const submitChain = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const times = route.stops.map((_, index) => {
      const raw = timeValue(index)
      const parsed = raw ? new Date(raw) : null
      return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
    })
    if (route.stops.length > 1 && times.some((value) => !value)) {
      setFormError('Укажите время для каждой точки маршрута')
      return
    }
    for (let i = 1; i < times.length; i += 1) {
      const previous = times[i - 1]
      const current = times[i]
      if (previous && current && current.getTime() <= previous.getTime()) {
        setFormError('Время точек должно идти по возрастанию: следующая точка позже предыдущей')
        return
      }
    }

    chainMutation.mutate({
      route_id: route.route_id,
      name: name.trim(),
      phone: phone.trim(),
      party_size: partyDefault,
      comment: comment.trim(),
      stops: route.stops.map((stop, index) => ({
        restaurant_id: stop.restaurant_id,
        dish_ids: dishIDsFor(stop),
        requested_at: times[index]?.toISOString(),
      })),
    })
  }

  const minTime = localDatetimeValue(new Date(Date.now() + 5 * 60_000))

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/room/${roomCode}`}
          className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
        >
          <ArrowLeft size={16} />
          В комнату
        </Link>
        <button
          type="button"
          onClick={() => refreshRoute.mutate()}
          disabled={refreshRoute.isPending}
          className="inline-flex items-center gap-2 text-xs font-semibold text-cream-300/55 transition hover:text-saffron-300 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(refreshRoute.isPending && 'animate-spin')} />
          Обновить маршрут
        </button>
      </div>

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

      {step === 1 ? (
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

      {step === 2 ? (
        <div className="space-y-3">
          <div className="surface p-4 sm:p-5">
            <RouteMap points={mapPoints} connect numbered />
          </div>
          <div className="surface space-y-2 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream-300/45">
              Дорога между точками
            </p>
            {route.legs.map((leg, index) => {
              const Icon = modeIcons[travelMode]
              return (
                <div
                  key={`${leg.from_restaurant_id}-${leg.to_restaurant_id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-cream-200/[0.07] bg-cream-50/[0.02] px-3 py-2 text-xs text-cream-200/70"
                >
                  <span>
                    {index + 1} → {index + 2}: {formatDistance(leg.distance_km)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-cream-300/55">
                    <Icon size={13} className="text-saffron-400" />
                    {formatMinutes(legMinutes(leg, travelMode))}
                  </span>
                </div>
              )
            })}
            <div className="flex flex-wrap gap-2 pt-1">
              {travelModes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeMode(item.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[11px] font-semibold transition',
                    travelMode === item.value
                      ? 'bg-saffron-400 text-ink-950'
                      : 'border border-cream-200/10 text-cream-300/55 hover:text-cream-50',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <p className="px-2 text-xs leading-relaxed text-cream-300/35">
            Все точки упорядочены от центра города по кратчайшему расстоянию. Время в пути
            приблизительное: без онлайн-навигации, по прямой с запасом.
          </p>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              {route.stops.map((stop) => (
                <div key={stop.restaurant_id} className="surface p-5">
                  <h2 className="font-display text-xl font-bold text-cream-50">{stop.name}</h2>
                  <p className="mt-1 text-xs text-cream-300/45">
                    {dishIDsFor(stop).length} из {stop.dishes.length} блюд в заявке
                  </p>
                  <div className="mt-3 space-y-2">
                    {stop.dishes.length === 0 ? (
                      <p className="text-xs text-cream-300/40">
                        Совпадений в этом ресторане нет — можно забронировать стол без блюд.
                      </p>
                    ) : (
                      stop.dishes.map((dish) => {
                        const picked = dishIDsFor(stop).includes(dish.dish_id)
                        return (
                          <button
                            key={dish.dish_id}
                            type="button"
                            onClick={() => toggleDish(stop, dish)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-sm transition',
                              picked
                                ? 'border-saffron-400/40 bg-saffron-400/[0.08] text-cream-50'
                                : 'border-cream-200/[0.08] bg-cream-50/[0.025] text-cream-200/75 hover:border-saffron-400/25',
                            )}
                          >
                            <span
                              className={cn(
                                'grid h-5 w-5 shrink-0 place-items-center rounded-md border',
                                picked
                                  ? 'border-saffron-400 bg-saffron-400 text-ink-950'
                                  : 'border-cream-200/25',
                              )}
                            >
                              {picked ? <Check size={13} strokeWidth={3} /> : null}
                            </span>
                            {dish.blind ? (
                              <EyeOff size={14} className="shrink-0 text-saffron-400" />
                            ) : (
                              <Utensils size={14} className="shrink-0 text-saffron-400" />
                            )}
                            <span className="min-w-0 flex-1 truncate">{dish.name}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            {routeDishes.length >= 2 ? (
              <div className="space-y-3">
                <MatchRoulette dishes={routeDishes} onPick={(dish) => applyRoulette(dish)} />
                <div className="surface p-4 text-xs leading-relaxed text-cream-300/50">
                  Рулетка добавляет блюдо к выбранной точке. Можно ткнуть в любое блюдо вручную —
                  ресторан увидит его в своей брони.
                </div>
              </div>
            ) : null}
          </div>

          <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-cream-200/70">
              В заявке {route.stops.reduce((total, stop) => total + dishIDsFor(stop).length, 0)} блюд
              в {route.stops.length} ресторанах
            </p>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-300 hover:text-saffron-400"
            >
              К времени и брони
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <form onSubmit={submitChain} className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface space-y-4 p-6">
            <div>
              <p className="eyebrow">Как поедем</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">
                {route.stops.length} точки за вечер
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                В каждом месте примерно {dwellMinutes} минут. Время в пути подставляется
                автоматически — его можно поправить.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {travelModes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeMode(item.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[11px] font-semibold transition',
                    travelMode === item.value
                      ? 'bg-saffron-400 text-ink-950'
                      : 'border border-cream-200/10 text-cream-300/55 hover:text-cream-50',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <ol className="space-y-3">
              {route.stops.map((stop, index) => {
                const leg = index > 0 ? route.legs[index - 1] : null
                const Icon = modeIcons[travelMode]
                const stopTime = timeValue(index)
                return (
                  <li key={stop.restaurant_id}>
                    {leg ? (
                      <div className="mb-2 ml-9 flex flex-wrap items-center gap-2 text-[11px] text-cream-300/45">
                        <Icon size={13} className="text-saffron-400" />
                        {formatDistance(leg.distance_km)} · {formatMinutes(legMinutes(leg, travelMode))}
                      </div>
                    ) : null}
                    <div className="flex gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-saffron-400 text-sm font-black text-ink-950">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-cream-100">{stop.name}</p>
                        <p className="text-xs text-cream-300/45">{stop.address}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Clock size={14} className="shrink-0 text-saffron-400" />
                          <Input
                            type="datetime-local"
                            aria-label={`Время точки ${index + 1}`}
                            min={minTime}
                            value={stopTime}
                            onChange={(event) =>
                              index === 0
                                ? changeStart(event.target.value)
                                : setManualTimes((value) => ({
                                    ...value,
                                    [index]: event.target.value,
                                  }))
                            }
                            required={route.stops.length > 1}
                            className="h-10"
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-cream-300/40">
                          {stop.dishes
                            .filter((dish) => dishIDsFor(stop).includes(dish.dish_id))
                            .map((dish) => dish.name)
                            .join(' · ') || 'Без выбранных блюд'}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>

            {route.legs.length > 0 ? (
              <div className="rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-4 py-3 text-xs leading-relaxed text-cream-300/50">
                Всего в пути {formatMinutes(totalMinutes(route.total, travelMode))} и{' '}
                {formatDistance(route.total.distance_km)} между точками.
              </div>
            ) : null}
          </div>

          <div className="surface space-y-4 p-6">
            <div>
              <p className="eyebrow">Финальный шаг</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">
                Забронировать вечер
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                Одна заявка на всю компанию: рестораны получат свои точки и подтвердят их по
                отдельности.
              </p>
            </div>
            <div>
              <label htmlFor="chain-name" className="field-label">
                Имя
              </label>
              <Input
                id="chain-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
              />
            </div>
            <div>
              <label htmlFor="chain-phone" className="field-label">
                Телефон
              </label>
              <Input
                id="chain-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+7 999 000-00-00"
                maxLength={40}
                required
              />
            </div>
            <div>
              <label htmlFor="chain-party" className="field-label">
                Гостей
              </label>
              <Input
                id="chain-party"
                type="number"
                min="1"
                max="20"
                value={partyDefault}
                onChange={(event) => setPartySize(Number(event.target.value))}
                required
              />
            </div>
            <div>
              <label htmlFor="chain-comment" className="field-label">
                Комментарий
              </label>
              <Textarea
                id="chain-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Повод, пожелания по столу…"
                maxLength={500}
              />
            </div>
            {formError ? (
              <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                {formError}
              </p>
            ) : null}
            {chainMutation.error ? (
              <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                {chainMutation.error instanceof Error
                  ? chainMutation.error.message
                  : 'Не удалось отправить вечер'}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={chainMutation.isPending}>
              {chainMutation.isPending ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Send size={17} />
              )}
              {chainMutation.isPending ? 'Отправляем…' : 'Забронировать вечер'}
            </Button>
            <p className="text-center text-xs text-cream-300/35">
              Это заявки, а не автоматическое подтверждение. Каждый ресторан подтверждает свою точку.
            </p>
          </div>
        </form>
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
          <Button onClick={() => setStep((value) => Math.min(4, value + 1))}>
            Далее
            <ChevronRight size={16} />
          </Button>
        ) : (
          <span className="text-xs text-cream-300/35">Одна компания — один вечер</span>
        )}
      </div>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-cream-300/35">
        <CheckCircle2 size={13} className="text-basil-400" />
        Время в пути приблизительное — уточняйте в навигаторе.
      </p>
    </div>
  )
}
