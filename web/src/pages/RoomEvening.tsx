import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Replace,
  Route as RouteIcon,
  Users,
  Utensils,
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { getSession } from '../lib/session'
import {
  bookingStatusLabel,
  chainStatusLabel,
  isActiveBookingStatus,
} from '../lib/restaurant'
import type { BookingChain, ChainStop, RoomSummary } from '../lib/types'
import {
  dwellMinutes,
  formatDistance,
  formatMinutes,
  localDatetimeValue,
  nextHalfHour,
  travelSummary,
} from '../lib/travel'
import { cn, formatDate } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

type ReplacementOption = {
  id: string
  name: string
  address: string
  dishes: { dish_id: string; name: string }[]
}

export function RoomEvening() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const session = getSession()
  const queryClient = useQueryClient()
  const [replacingID, setReplacingID] = useState<string | null>(null)
  const [optionIndex, setOptionIndex] = useState(0)
  const [replaceTime, setReplaceTime] = useState(() => localDatetimeValue(nextHalfHour()))
  const [replaceDishIDs, setReplaceDishIDs] = useState<string[]>([])
  const [actionError, setActionError] = useState<string | null>(null)

  const summaryQuery = useQuery({
    queryKey: ['room-summary', roomCode],
    queryFn: () => api.roomSummary(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
    refetchInterval: 15_000,
  })
  const routeQuery = useQuery({
    queryKey: ['route', roomCode],
    queryFn: () => api.route(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
  })

  const applyChain = (chain: BookingChain) => {
    queryClient.setQueryData<RoomSummary>(['room-summary', roomCode], (current) =>
      current ? { ...current, chain } : current,
    )
    queryClient.invalidateQueries({ queryKey: ['room-summary', roomCode] })
  }

  const cancelStop = useMutation({
    mutationFn: ({ chainID, bookingID }: { chainID: string; bookingID: string }) =>
      api.cancelChainStop(session!.token, chainID, bookingID),
    onSuccess: applyChain,
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Не удалось отменить точку'),
  })

  const cancelChain = useMutation({
    mutationFn: (chainID: string) => api.cancelChain(session!.token, chainID),
    onSuccess: applyChain,
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Не удалось отменить вечер'),
  })

  const replaceStop = useMutation({
    mutationFn: ({
      chainID,
      stop,
      option,
      time,
      dishIDs,
    }: {
      chainID: string
      stop: ChainStop
      option: ReplacementOption
      time: string
      dishIDs: string[]
    }) =>
      api.addChainStop(session!.token, chainID, {
        replace_booking_id: stop.booking_id,
        stop_order: stop.stop_order,
        restaurant_id: option.id,
        requested_at: time ? new Date(time).toISOString() : undefined,
        dish_ids: dishIDs,
      }),
    onSuccess: (chain) => {
      applyChain(chain)
      setReplacingID(null)
      setOptionIndex(0)
      setReplaceDishIDs([])
      setActionError(null)
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Не удалось заменить точку'),
  })

  if (!session || session.roomCode !== roomCode) {
    return <Navigate to={`/r/${roomCode}`} replace />
  }

  if (summaryQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-cream-300/60">
        <Loader2 size={18} className="animate-spin text-saffron-400" />
        Загружаем вечер…
      </div>
    )
  }

  if (summaryQuery.error || !summaryQuery.data) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center">
        <h1 className="font-display text-3xl font-bold text-cream-50">Не удалось открыть вечер</h1>
        <p className="mt-2 text-sm text-cream-300/60">
          {summaryQuery.error instanceof Error
            ? summaryQuery.error.message
            : 'Попробуйте обновить страницу'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => summaryQuery.refetch()}>
            Повторить
          </Button>
          <Link
            to={`/room/${roomCode}`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100"
          >
            В комнату
          </Link>
        </div>
      </div>
    )
  }

  const chain = summaryQuery.data.chain
  const room = summaryQuery.data.room
  if (!chain) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center sm:p-9">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
          <RouteIcon size={28} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold text-cream-50">Вечер ещё не собран</h1>
        <p className="mt-3 text-sm leading-relaxed text-cream-300/60">
          Когда в комнате появятся совпадения в двух ресторанах, соберите маршрут и забронируйте
          1–3 точки на один вечер.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={`/room/${roomCode}/route`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
          >
            <RouteIcon size={17} />
            Собрать маршрут
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

  const isOwner = chain.participant_id === session.participantId
  const activeStops = chain.stops.filter((stop) => isActiveBookingStatus(stop.status))
  const closed = chain.status === 'cancelled' || chain.status === 'declined' || activeStops.length === 0
  const route = routeQuery.data ?? null
  const routeUsedIDs = new Set(activeStops.map((stop) => stop.restaurant_id))
  const options: ReplacementOption[] = route
    ? route.stops.map((stop) => ({
        id: stop.restaurant_id,
        name: stop.name,
        address: stop.address,
        dishes: stop.dishes.map((dish) => ({ dish_id: dish.dish_id, name: dish.name })),
      }))
    : summaryQuery.data.restaurants
        .filter((restaurant) => restaurant.matches > 0)
        .map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          dishes: restaurant.dishes.map((dish) => ({ dish_id: dish.dish_id, name: dish.name })),
        }))
  const freeOptions = options.filter((option) => !routeUsedIDs.has(option.id))

  const startReplace = (stop: ChainStop) => {
    setActionError(null)
    setReplacingID(stop.booking_id)
    setOptionIndex(0)
    setReplaceDishIDs(freeOptions[0]?.dishes.map((dish) => dish.dish_id) ?? [])
    setReplaceTime(localDatetimeValue(nextHalfHour()))
  }

  const chooseOption = (index: number) => {
    setOptionIndex(index)
    setReplaceDishIDs(freeOptions[index]?.dishes.map((dish) => dish.dish_id) ?? [])
  }

  const toggleReplaceDish = (dishID: string) => {
    setReplaceDishIDs((current) =>
      current.includes(dishID) ? current.filter((id) => id !== dishID) : [...current, dishID],
    )
  }

  const submitReplace = (event: FormEvent, stop: ChainStop) => {
    event.preventDefault()
    const option = freeOptions[optionIndex]
    if (!option) {
      setActionError('В маршруте не осталось свободных ресторанов')
      return
    }
    replaceStop.mutate({
      chainID: chain.id,
      stop,
      option,
      time: replaceTime,
      dishIDs: replaceDishIDs,
    })
  }

  const dishesFor = (stop: ChainStop) => stop.dishes

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
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
          onClick={() => summaryQuery.refetch()}
          disabled={summaryQuery.isFetching}
          className="inline-flex items-center gap-2 text-xs font-semibold text-cream-300/55 transition hover:text-saffron-300 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(summaryQuery.isFetching && 'animate-spin')} />
          Обновить статусы
        </button>
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/12 via-transparent to-basil-400/10 p-6 sm:p-8">
          <p className="eyebrow">Вечер компании · {room.city}</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-cream-50">
            {activeStops.length || chain.stops.length} точки,
            <span className="block text-saffron-300">один маршрут</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold',
                chain.status === 'confirmed'
                  ? 'border-basil-400/25 bg-basil-400/10 text-basil-400'
                  : closed
                    ? 'border-tomato-400/25 bg-tomato-500/10 text-tomato-400'
                    : 'border-saffron-400/25 bg-saffron-400/10 text-saffron-300',
              )}
            >
              {closed ? <XCircle size={13} /> : <CalendarCheck size={13} />}
              {chainStatusLabel(chain.status)}
            </span>
            <span className="flex items-center gap-1.5 text-cream-300/55">
              <Users size={13} className="text-saffron-400" />
              {chain.name} · {chain.party_size} гостей
            </span>
            {isOwner ? (
              <span className="text-cream-300/45">{chain.phone}</span>
            ) : (
              <span className="text-cream-300/45">телефон скрыт</span>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-cream-300/45">
            Каждый ресторан подтверждает свою точку отдельно. Если одна точка откажет, остальные
            останутся в силе — можно подобрать замену.
          </p>
        </div>

        <div className="space-y-4 p-6 sm:p-8">
          {chain.comment ? (
            <p className="rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-4 py-3 text-sm leading-relaxed text-cream-200/70">
              {chain.comment}
            </p>
          ) : null}

          <ol className="space-y-4">
            {chain.stops.map((stop) => {
              const active = isActiveBookingStatus(stop.status)
              const canReplace = isOwner && !active && !closed
              const routeStop = route?.stops[stop.stop_order - 1]
              const leg = stop.stop_order > 1 ? route?.legs[stop.stop_order - 2] : null
              const sameRoutePosition = routeStop?.restaurant_id === stop.restaurant_id
              const replacing = replacingID === stop.booking_id
              return (
                <li key={stop.booking_id}>
                  {leg && sameRoutePosition ? (
                    <div className="mb-2 ml-9 text-[11px] text-cream-300/40">
                      {travelSummary(leg)}
                    </div>
                  ) : null}
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black',
                        active ? 'bg-saffron-400 text-ink-950' : 'bg-cream-50/[0.06] text-cream-300/45',
                      )}
                    >
                      {stop.stop_order}
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl border border-cream-200/[0.08] bg-cream-50/[0.02] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="font-display text-xl font-bold leading-tight text-cream-50">
                            {stop.restaurant_name}
                          </h2>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-cream-300/45">
                            <MapPin size={12} className="text-saffron-400" />
                            {stop.restaurant_address || stop.restaurant_city}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                            stop.status === 'confirmed'
                              ? 'bg-basil-400/10 text-basil-400'
                              : stop.status === 'declined' || stop.status === 'cancelled'
                                ? 'bg-tomato-500/10 text-tomato-400'
                                : 'bg-saffron-400/10 text-saffron-300',
                          )}
                        >
                          {bookingStatusLabel(stop.status)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-cream-200/65">
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-saffron-400" />
                          {stop.requested_at ? formatDate(stop.requested_at) : 'время уточняется'}
                        </span>
                      </div>

                      {dishesFor(stop).length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {dishesFor(stop).map((dish) => (
                            <span
                              key={dish.dish_id}
                              className="inline-flex items-center gap-1 rounded-full border border-cream-200/10 px-2.5 py-1 text-[11px] text-cream-200/65"
                            >
                              {dish.name}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {isOwner && active ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={cancelStop.isPending && cancelStop.variables?.bookingID === stop.booking_id}
                            onClick={() => {
                              setActionError(null)
                              cancelStop.mutate({ chainID: chain.id, bookingID: stop.booking_id })
                            }}
                          >
                            {cancelStop.isPending && cancelStop.variables?.bookingID === stop.booking_id
                              ? 'Отменяем…'
                              : 'Отменить точку'}
                          </Button>
                        </div>
                      ) : null}

                      {!isOwner ? (
                        <p className="mt-3 text-[11px] text-cream-300/35">
                          Изменить вечер может только его автор — {chain.name}.
                        </p>
                      ) : null}

                      {canReplace ? (
                        <div className="mt-3">
                          {!replacing ? (
                            <Button size="sm" onClick={() => startReplace(stop)}>
                              <Replace size={15} />
                              Подобрать замену
                            </Button>
                          ) : (
                            <form
                              onSubmit={(event) => submitReplace(event, stop)}
                              className="space-y-3 rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.05] p-4"
                            >
                              <p className="text-xs font-semibold uppercase tracking-wider text-saffron-300">
                                Замена точки {stop.stop_order}
                              </p>
                              {freeOptions.length === 0 ? (
                                <p className="text-xs leading-relaxed text-cream-300/55">
                                  В маршруте больше нет свободных ресторанов. Обновите маршрут на
                                  экране маршрута или оставьте вечер из{' '}
                                  {activeStops.length} точек.
                                </p>
                              ) : (
                                <>
                                  <div className="space-y-1.5">
                                    {freeOptions.map((option, index) => (
                                      <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => chooseOption(index)}
                                        className={cn(
                                          'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition',
                                          optionIndex === index
                                            ? 'border-saffron-400/40 bg-saffron-400/[0.08] text-cream-50'
                                            : 'border-cream-200/[0.08] text-cream-200/70 hover:border-saffron-400/25',
                                        )}
                                      >
                                        <span className="min-w-0">
                                          <span className="block truncate font-semibold">
                                            {option.name}
                                          </span>
                                          <span className="block truncate text-[10px] text-cream-300/40">
                                            {option.address}
                                          </span>
                                        </span>
                                        {optionIndex === index ? (
                                          <CheckCircle2 size={15} className="shrink-0 text-saffron-300" />
                                        ) : null}
                                      </button>
                                    ))}
                                  </div>
                                  <div>
                                    <label className="field-label" htmlFor={`replace-time-${stop.booking_id}`}>
                                      Когда
                                    </label>
                                    <Input
                                      id={`replace-time-${stop.booking_id}`}
                                      type="datetime-local"
                                      value={replaceTime}
                                      onChange={(event) => setReplaceTime(event.target.value)}
                                      required
                                    />
                                  </div>
                                  {freeOptions[optionIndex]?.dishes.length ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {freeOptions[optionIndex].dishes.map((dish) => {
                                        const picked = replaceDishIDs.includes(dish.dish_id)
                                        return (
                                          <button
                                            key={dish.dish_id}
                                            type="button"
                                            onClick={() => toggleReplaceDish(dish.dish_id)}
                                            className={cn(
                                              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition',
                                              picked
                                                ? 'border-saffron-400/40 bg-saffron-400/10 text-cream-50'
                                                : 'border-cream-200/10 text-cream-300/55',
                                            )}
                                          >
                                            {picked ? <Check size={11} /> : <Utensils size={11} />}
                                            {dish.name}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  ) : null}
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="submit"
                                      size="sm"
                                      disabled={replaceStop.isPending || !freeOptions[optionIndex]}
                                    >
                                      {replaceStop.isPending ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : null}
                                      {replaceStop.isPending ? 'Заменяем…' : 'Заменить'}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setReplacingID(null)}
                                    >
                                      Отмена
                                    </Button>
                                  </div>
                                </>
                              )}
                            </form>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          {actionError ? (
            <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
              {actionError}
            </p>
          ) : null}

          {closed ? (
            <div className="rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-4 py-3 text-sm leading-relaxed text-cream-300/55">
              {chain.status === 'cancelled'
                ? 'Вечер отменён. Можно собрать новый маршрут или забронировать один ресторан.'
                : 'Все точки отказали или отменены. Попробуйте другой маршрут или один ресторан.'}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link
              to={`/room/${roomCode}/route`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
            >
              <RouteIcon size={16} />
              Маршрут
            </Link>
            <Link
              to={`/room/${roomCode}/choice`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
            >
              <Utensils size={16} />
              Один ресторан
            </Link>
            {isOwner && !closed ? (
              <Button
                variant="danger"
                disabled={cancelChain.isPending}
                onClick={() => {
                  setActionError(null)
                  cancelChain.mutate(chain.id)
                }}
              >
                {cancelChain.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                {cancelChain.isPending ? 'Отменяем…' : 'Отменить вечер'}
              </Button>
            ) : null}
          </div>

          <p className="flex items-center gap-2 text-xs text-cream-300/35">
            <CheckCircle2 size={13} className="text-basil-400" />
            Статусы обновляются автоматически. Каждая точка видна в кабинете своего ресторана.
          </p>
        </div>
      </div>

      {route?.legs.length ? (
        <div className="surface p-5 text-xs leading-relaxed text-cream-300/45">
          Дорога между точками: около {dwellMinutes} минут в каждом месте, время в пути
          приблизительное — {formatMinutes(route.total.walk_min)} пешком или{' '}
          {formatMinutes(route.total.taxi_min)} на такси, всего{' '}
          {formatDistance(route.total.distance_km)}.
        </div>
      ) : null}
    </div>
  )
}
