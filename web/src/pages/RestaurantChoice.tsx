import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  EyeOff,
  Heart,
  Loader2,
  MapPin,
  Route as RouteIcon,
  Send,
  Sparkles,
  Users,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { getSession } from '../lib/session'
import { bookingStatusLabel } from '../lib/restaurant'
import type { Booking, RoomSummary, SelectionDish, SummaryRestaurant } from '../lib/types'
import { cn, cuisineGradient, formatDate, formatPrice } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'

const activeStatuses = new Set(['new', 'contacted', 'confirmed'])

function localDatetimeValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function initialForm(name: string, partySize: number) {
  return {
    name,
    phone: '',
    party_size: partySize,
    requested_at: '',
    comment: '',
  }
}

function bookingStatusTone(status: string) {
  if (status === 'confirmed' || status === 'completed') {
    return 'border-basil-400/25 bg-basil-400/10 text-basil-400'
  }
  if (status === 'cancelled' || status === 'declined') {
    return 'border-tomato-400/25 bg-tomato-500/10 text-tomato-400'
  }
  return 'border-saffron-400/25 bg-saffron-400/10 text-saffron-300'
}

export function RestaurantChoice() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const session = getSession()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'status' | 'list' | 'form'>('list')
  const [selectedRestaurant, setSelectedRestaurant] = useState<SummaryRestaurant | null>(null)
  const [selectedDishIDs, setSelectedDishIDs] = useState<string[]>([])
  const [loadedBookingID, setLoadedBookingID] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm(session?.name ?? '', 0))

  const summaryQuery = useQuery({
    queryKey: ['room-summary', roomCode],
    queryFn: () => api.roomSummary(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
    refetchInterval: 10_000,
  })
  const summary = summaryQuery.data
  const booking = summary?.booking ?? null
  const room = summary?.room
  const restaurants = summary?.restaurants ?? []

  const bookingMutation = useMutation({
    mutationFn: () => {
      if (!selectedRestaurant) throw new Error('Выберите ресторан')
      return api.createBooking(session!.token, {
        restaurant_id: selectedRestaurant.id,
        dish_ids: selectedDishIDs,
        name: form.name.trim(),
        phone: form.phone.trim(),
        party_size: Number(form.party_size) || 1,
        requested_at: form.requested_at
          ? new Date(form.requested_at).toISOString()
          : undefined,
        comment: form.comment.trim(),
      })
    },
    onSuccess: (created) => {
      setLoadedBookingID(created.id)
      setForm({
        name: created.name,
        phone: created.phone,
        party_size: created.party_size,
        requested_at: created.requested_at
          ? localDatetimeValue(new Date(created.requested_at))
          : '',
        comment: created.comment,
      })
      setView('status')
      queryClient.setQueryData<RoomSummary>(['room-summary', roomCode], (current) =>
        current ? { ...current, booking: created } : current,
      )
      queryClient.invalidateQueries({ queryKey: ['room-summary', roomCode] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (bookingID: string) => api.cancelBooking(session!.token, bookingID),
    onSuccess: (updated) => {
      setLoadedBookingID(updated.id)
      setView('status')
      queryClient.setQueryData<RoomSummary>(['room-summary', roomCode], (current) =>
        current ? { ...current, booking: updated } : current,
      )
      queryClient.invalidateQueries({ queryKey: ['room-summary', roomCode] })
    },
  })

  useEffect(() => {
    if (!booking || booking.id === loadedBookingID) return
    const restaurant =
      summary?.restaurants.find((item) => item.id === booking.restaurant_id) ?? null
    const isOwner = booking.participant_id === session?.participantId
    setLoadedBookingID(booking.id)
    setSelectedRestaurant(restaurant)
    setSelectedDishIDs(booking.dishes.map((dish) => dish.dish_id))
    setForm(
      isOwner
        ? {
            name: booking.name,
            phone: booking.phone,
            party_size: booking.party_size,
            requested_at: booking.requested_at
              ? localDatetimeValue(new Date(booking.requested_at))
              : '',
            comment: booking.comment,
          }
        : initialForm(session?.name ?? '', summary?.room.participants_count ?? 1),
    )
    setView('status')
  }, [
    booking,
    loadedBookingID,
    session?.name,
    session?.participantId,
    summary?.restaurants,
    summary?.room.participants_count,
  ])

  if (!session || session.roomCode !== roomCode) {
    return <Navigate to={`/r/${roomCode}`} replace />
  }

  if (summaryQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-cream-300/60">
        <Loader2 size={18} className="animate-spin text-saffron-400" />
        Собираем совпадения…
      </div>
    )
  }

  if (summaryQuery.error || !summary || !room) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center">
        <h1 className="font-display text-3xl font-bold text-cream-50">Не удалось открыть выбор</h1>
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

  const isOwner = booking ? booking.participant_id === session.participantId : false
  const activeBooking = Boolean(booking && activeStatuses.has(booking.status))
  const matchedRestaurants = restaurants.filter((item) => item.matches > 0)
  const otherRestaurants = restaurants.filter((item) => item.matches === 0)
  const routeReady = matchedRestaurants.length >= 2

  const chooseRestaurant = (restaurant: SummaryRestaurant) => {
    setSelectedRestaurant(restaurant)
    setSelectedDishIDs(restaurant.dishes.map((dish) => dish.dish_id))
    setForm((current) => ({
      ...current,
      party_size: current.party_size || room.participants_count || 1,
    }))
    bookingMutation.reset()
    setView('form')
  }

  const startEditing = () => {
    if (!booking) return
    const restaurant =
      restaurants.find((item) => item.id === booking.restaurant_id) ?? selectedRestaurant
    setSelectedRestaurant(restaurant)
    setSelectedDishIDs(booking.dishes.map((dish) => dish.dish_id))
    setForm({
      name: booking.name,
      phone: booking.phone,
      party_size: booking.party_size,
      requested_at: booking.requested_at
        ? localDatetimeValue(new Date(booking.requested_at))
        : '',
      comment: booking.comment,
    })
    bookingMutation.reset()
    setView('form')
  }

  const startRebooking = () => {
    bookingMutation.reset()
    if (selectedRestaurant) {
      setSelectedDishIDs(selectedRestaurant.dishes.map((dish) => dish.dish_id))
      if (!isOwner) {
        setForm(initialForm(session.name, room.participants_count || 1))
      }
      setView('form')
      return
    }
    setView('list')
  }

  const toggleDish = (dish: SelectionDish) => {
    setSelectedDishIDs((current) =>
      current.includes(dish.dish_id)
        ? current.filter((id) => id !== dish.dish_id)
        : [...current, dish.dish_id],
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    bookingMutation.mutate()
  }

  if (view === 'status' && booking) {
    return (
      <BookingStatus
        roomCode={roomCode}
        booking={booking}
        restaurant={selectedRestaurant}
        isOwner={isOwner}
        active={activeBooking}
        cancelPending={cancelMutation.isPending}
        cancelError={
          cancelMutation.error instanceof Error ? cancelMutation.error.message : null
        }
        onEdit={startEditing}
        onCancel={() => {
          if (!cancelMutation.isPending) cancelMutation.mutate(booking.id)
        }}
        onRebook={startRebooking}
        routeReady={routeReady}
      />
    )
  }

  if (view === 'form' && selectedRestaurant) {
    const partyDefault = form.party_size || room.participants_count || 1
    const minDate = localDatetimeValue(new Date(Date.now() + 5 * 60_000))
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={`/room/${roomCode}`}
            className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
          >
            <ArrowLeft size={16} />
            В комнату
          </Link>
          {!activeBooking ? (
            <button
              type="button"
              onClick={() => setView('list')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-saffron-300 hover:text-saffron-400"
            >
              Выбрать другой ресторан
              <ChevronRight size={16} />
            </button>
          ) : (
            <Link
              to={`/room/${roomCode}/swipes`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-saffron-300 hover:text-saffron-400"
            >
              <UtensilsCrossed size={16} />
              Продолжить свайпы
            </Link>
          )}
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/12 via-transparent to-basil-400/10 p-6 sm:p-8">
            <p className="eyebrow">Один ресторан на всю компанию</p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-cream-50">
              {selectedRestaurant.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-cream-300/55">
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-saffron-400" />
                {selectedRestaurant.address || selectedRestaurant.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-saffron-400" />
                {room.participants_count} участников
              </span>
              <span className="flex items-center gap-1.5">
                <Heart size={13} className="text-tomato-400" />
                {selectedRestaurant.matches} совпадений
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-2xl font-bold text-cream-50">Что берём</h2>
              <p className="mt-1 text-sm text-cream-300/50">
                Отметьте совпавшие блюда — ресторан увидит их в брони.
              </p>
              {selectedRestaurant.dishes.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] p-5 text-sm leading-relaxed text-cream-300/60">
                  В этом ресторане пока нет совпадений. Можно забронировать стол и обсудить меню
                  с рестораном.
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {selectedRestaurant.dishes.map((dish) => {
                    const picked = selectedDishIDs.includes(dish.dish_id)
                    return (
                      <button
                        key={dish.dish_id}
                        type="button"
                        onClick={() => toggleDish(dish)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition',
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
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold">{dish.name}</span>
                            {dish.blind ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-saffron-400/25 bg-saffron-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-saffron-300">
                                <EyeOff size={10} />
                                вслепую
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-cream-300/45">
                            {dish.likes} лайков
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-saffron-300">
                          {formatPrice(dish.price)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <form onSubmit={submit} className="space-y-4">
                <div className="flex items-center gap-2 text-saffron-300">
                  <CalendarCheck size={18} />
                  <h2 className="font-display text-2xl font-bold text-cream-50">Забронировать стол</h2>
                </div>
                <p className="text-sm leading-relaxed text-cream-300/60">
                  Одна бронь на всю компанию. Ресторан увидит выбранные блюда и свяжется, чтобы
                  подтвердить время и стол.
                </p>
                <div>
                  <label htmlFor="choice-name" className="field-label">
                    Имя
                  </label>
                  <Input
                    id="choice-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    maxLength={80}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="choice-phone" className="field-label">
                    Телефон
                  </label>
                  <Input
                    id="choice-phone"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="+7 999 000-00-00"
                    maxLength={40}
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="choice-party" className="field-label">
                      Гостей
                    </label>
                    <Input
                      id="choice-party"
                      type="number"
                      min="1"
                      max="20"
                      value={partyDefault}
                      onChange={(event) =>
                        setForm({ ...form, party_size: Number(event.target.value) })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="choice-time" className="field-label">
                      Когда
                    </label>
                    <Input
                      id="choice-time"
                      type="datetime-local"
                      min={minDate}
                      value={form.requested_at}
                      onChange={(event) => setForm({ ...form, requested_at: event.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="choice-comment" className="field-label">
                    Комментарий
                  </label>
                  <Textarea
                    id="choice-comment"
                    value={form.comment}
                    onChange={(event) => setForm({ ...form, comment: event.target.value })}
                    placeholder="Пожелания по столу, повод…"
                    maxLength={500}
                  />
                </div>
                {bookingMutation.error ? (
                  <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                    {bookingMutation.error instanceof Error
                      ? bookingMutation.error.message
                      : 'Не удалось отправить бронь'}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={bookingMutation.isPending}>
                  {bookingMutation.isPending ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                  {bookingMutation.isPending ? 'Отправляем…' : 'Забронировать'}
                </Button>
                <p className="text-center text-xs text-cream-300/35">
                  Это заявка, а не автоматическое подтверждение. С вами свяжутся.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/room/${roomCode}`}
          className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
        >
          <ArrowLeft size={16} />
          В комнату
        </Link>
        <Link
          to={`/room/${roomCode}/swipes`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-saffron-300 hover:text-saffron-400"
        >
          <UtensilsCrossed size={16} />
          К свайпам
        </Link>
      </div>

      <div>
        <p className="eyebrow">Городская комната · {room.city}</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
          Куда идём
          <span className="block text-saffron-300">всей компанией?</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-300/60">
          Выберите один ресторан, отметьте совпавшие блюда и оставьте одну бронь на всех.
          {routeReady ? ' Или соберите маршрут по нескольким ресторанам.' : ''}
        </p>
      </div>

      {routeReady ? (
        <Link
          to={`/room/${roomCode}/route`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-basil-400/20 bg-basil-400/[0.06] px-4 py-3 text-sm text-cream-200/75 transition hover:border-basil-400/40"
        >
          <span className="flex items-center gap-2">
            <RouteIcon size={17} className="text-basil-400" />
            Хочу маршрут по нескольким ресторанам
          </span>
          <ChevronRight size={16} className="shrink-0 text-basil-400" />
        </Link>
      ) : null}

      {matchedRestaurants.length === 0 ? (
        <div className="rounded-2xl border border-saffron-400/15 bg-saffron-400/[0.06] px-4 py-3 text-sm leading-relaxed text-saffron-200/85">
          Совпадений пока нет. Можно выбрать ресторан вручную или вернуться к свайпам, чтобы
          найти общие вкусы.
        </div>
      ) : null}

      {matchedRestaurants.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-tomato-400" />
            <h2 className="font-display text-2xl font-bold text-cream-50">Совпали</h2>
            <span className="rounded-full bg-tomato-500/10 px-2 py-0.5 text-[10px] font-semibold text-tomato-300">
              {matchedRestaurants.length}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {matchedRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onChoose={() => chooseRestaurant(restaurant)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {otherRestaurants.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-saffron-400" />
            <h2 className="font-display text-2xl font-bold text-cream-50">Другие места города</h2>
          </div>
          <p className="text-sm text-cream-300/50">
            Если хотите просто стол — выберите ресторан вручную.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {otherRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onChoose={() => chooseRestaurant(restaurant)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {restaurants.length === 0 ? (
        <div className="surface p-8 text-center">
          <UtensilsCrossed className="mx-auto text-cream-300/30" size={34} />
          <h2 className="mt-3 font-display text-2xl font-bold text-cream-50">
            В городе пока нет ресторанов
          </h2>
          <p className="mt-2 text-sm text-cream-300/55">
            Выберите другой город на главной или загляните позже.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function RestaurantCard({
  restaurant,
  onChoose,
}: {
  restaurant: SummaryRestaurant
  onChoose: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      className="surface group overflow-hidden text-left transition hover:border-saffron-400/40"
    >
      <div
        className={cn(
          'relative h-28 overflow-hidden bg-gradient-to-br',
          cuisineGradient(restaurant.cuisine),
        )}
      >
        {restaurant.cover_url ? (
          <img
            src={restaurant.cover_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <UtensilsCrossed className="absolute inset-0 m-auto text-cream-50/35" size={34} />
        )}
        {restaurant.matches > 0 ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink-950/75 px-2.5 py-1 text-[10px] font-bold text-saffron-300 backdrop-blur">
            <Heart size={11} fill="currentColor" />
            {restaurant.matches}
          </span>
        ) : null}
      </div>
      <div className="p-5">
        <h3 className="font-display text-2xl font-bold leading-tight text-cream-50">
          {restaurant.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-cream-300/50">
          {[restaurant.cuisine, restaurant.address].filter(Boolean).join(' · ')}
        </p>
        {restaurant.dishes.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {restaurant.dishes.slice(0, 3).map((dish) => (
              <span
                key={dish.dish_id}
                className="max-w-full truncate rounded-full border border-cream-200/10 px-2.5 py-1 text-[11px] text-cream-200/65"
              >
                {dish.name}
              </span>
            ))}
            {restaurant.dishes.length > 3 ? (
              <span className="rounded-full bg-cream-50/[0.04] px-2.5 py-1 text-[11px] text-cream-300/50">
                +{restaurant.dishes.length - 3}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-cream-300/35">Без совпадений — просто стол</p>
        )}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-saffron-300">
          Выбрать
          <ChevronRight size={15} />
        </span>
      </div>
    </button>
  )
}

function BookingStatus({
  roomCode,
  booking,
  restaurant,
  isOwner,
  active,
  cancelPending,
  cancelError,
  onEdit,
  onCancel,
  onRebook,
  routeReady,
}: {
  roomCode: string
  booking: Booking
  restaurant: SummaryRestaurant | null
  isOwner: boolean
  active: boolean
  cancelPending: boolean
  cancelError: string | null
  onEdit: () => void
  onCancel: () => void
  onRebook: () => void
  routeReady: boolean
}) {
  const tone = bookingStatusTone(booking.status)
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/room/${roomCode}`}
          className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
        >
          <ArrowLeft size={16} />
          В комнату
        </Link>
        <Link
          to={`/room/${roomCode}/swipes`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-saffron-300 hover:text-saffron-400"
        >
          <UtensilsCrossed size={16} />
          К свайпам
        </Link>
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/12 via-transparent to-basil-400/10 p-6 sm:p-8">
          <p className="eyebrow">Бронь компании</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-cream-50">
            {restaurant?.name ?? 'Ресторан'}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
                tone,
              )}
            >
              {active ? <CalendarCheck size={13} /> : <XCircle size={13} />}
              {bookingStatusLabel(booking.status)}
            </span>
            {restaurant ? (
              <span className="flex items-center gap-1.5 text-xs text-cream-300/55">
                <MapPin size={13} className="text-saffron-400" />
                {restaurant.address || restaurant.city}
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-5 p-6 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] p-4">
              <p className="field-label">Когда</p>
              <p className="mt-1 text-sm font-semibold text-cream-100">
                {booking.requested_at ? formatDate(booking.requested_at) : 'Ресторан предложит время'}
              </p>
            </div>
            <div className="rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] p-4">
              <p className="field-label">Гостей</p>
              <p className="mt-1 text-sm font-semibold text-cream-100">{booking.party_size}</p>
            </div>
            <div className="rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] p-4">
              <p className="field-label">Контакт</p>
              <p className="mt-1 break-all text-sm font-semibold text-cream-100">
                {booking.name} · {booking.phone}
              </p>
            </div>
          </div>

          {booking.dishes.length > 0 ? (
            <div>
              <p className="field-label">Блюда в брони</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {booking.dishes.map((dish) => (
                  <span
                    key={dish.dish_id}
                    className="break-words rounded-full border border-cream-200/10 px-3 py-1.5 text-xs text-cream-200/70"
                  >
                    {dish.name} · {formatPrice(dish.price ?? 0)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {booking.comment ? (
            <p className="rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-4 py-3 text-sm leading-relaxed text-cream-200/70">
              {booking.comment}
            </p>
          ) : null}

          {!isOwner ? (
            <div className="rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.06] px-4 py-3 text-sm leading-relaxed text-saffron-100/80">
              Бронь создал участник <span className="font-semibold">{booking.name}</span>. Телефон
              скрыт, изменить или отменить бронь может только её автор.
            </div>
          ) : null}

          {active ? (
            <div className="rounded-2xl border border-basil-400/20 bg-basil-400/[0.08] px-4 py-3 text-sm leading-relaxed text-cream-200/75">
              {booking.status === 'confirmed'
                ? 'Ресторан подтвердил бронь. Хорошего вечера!'
                : 'Ресторан получил заявку. С вами свяжутся, чтобы подтвердить стол и время.'}
            </div>
          ) : null}

          {cancelError ? (
            <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
              {cancelError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {isOwner && active && booking.status !== 'confirmed' ? (
              <Button variant="secondary" onClick={onEdit}>
                Изменить данные
              </Button>
            ) : null}
            {isOwner && active ? (
              <Button variant="danger" onClick={onCancel} disabled={cancelPending}>
                {cancelPending ? <Loader2 size={16} className="animate-spin" /> : null}
                {cancelPending ? 'Отменяем…' : 'Отменить бронь'}
              </Button>
            ) : null}
            {!active && (booking.status === 'cancelled' || booking.status === 'declined') ? (
              <Button onClick={onRebook}>Забронировать снова</Button>
            ) : null}
            <Link
              to={`/room/${roomCode}`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
            >
              <Users size={16} />
              В комнату
            </Link>
            {routeReady ? (
              <Link
                to={`/room/${roomCode}/route`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-basil-400/20 px-5 text-sm font-semibold text-basil-400 transition hover:border-basil-400/40"
              >
                <RouteIcon size={16} />
                Маршрут
              </Link>
            ) : null}
          </div>

          <p className="flex items-center gap-2 text-xs text-cream-300/35">
            <CheckCircle2 size={13} className="text-basil-400" />
            Статус обновляется автоматически. Бронь видна в кабинете ресторана.
          </p>
        </div>
      </div>
    </div>
  )
}
