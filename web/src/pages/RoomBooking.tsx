import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Heart,
  Loader2,
  MapPin,
  Send,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { ApiError, api } from '../lib/api'
import { getSession } from '../lib/session'
import { bookingStatusLabel } from '../lib/restaurant'
import { formatDate, formatPrice } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'

function localDatetimeValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function RoomBooking() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const session = getSession()
  const queryClient = useQueryClient()
  const [loadedBookingID, setLoadedBookingID] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: session?.name ?? '',
    phone: '',
    party_size: 0,
    requested_at: '',
    comment: '',
  })
  const [sent, setSent] = useState(false)

  const selectionQuery = useQuery({
    queryKey: ['selection', roomCode],
    queryFn: () => api.selection(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
    refetchInterval: 10_000,
  })

  const bookingMutation = useMutation({
    mutationFn: () =>
      api.createBooking(session!.token, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        party_size: Number(form.party_size) || 1,
        requested_at: form.requested_at ? new Date(form.requested_at).toISOString() : undefined,
        comment: form.comment.trim(),
      }),
    onSuccess: () => {
      setSent(true)
      queryClient.invalidateQueries({ queryKey: ['selection', roomCode] })
    },
  })

  useEffect(() => {
    const selection = selectionQuery.data
    if (!selection || !selection.booking || selection.booking.id === loadedBookingID) return
    const booking = selection.booking
    setLoadedBookingID(booking.id)
    setForm({
      name: booking.name,
      phone: booking.phone,
      party_size: booking.party_size,
      requested_at: booking.requested_at ? localDatetimeValue(new Date(booking.requested_at)) : '',
      comment: booking.comment,
    })
  }, [selectionQuery.data, loadedBookingID])

  if (!session || session.roomCode !== roomCode) {
    return <Navigate to={`/r/${roomCode}`} replace />
  }

  const selection = selectionQuery.data
  const room = selection?.room
  const restaurant = selection?.restaurant
  const dishes = selection?.dishes ?? []
  const booking = selection?.booking
  const cityRoom = selectionQuery.error instanceof ApiError && selectionQuery.error.status === 409

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSent(false)
    bookingMutation.mutate()
  }

  if (selectionQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-cream-300/60">
        <Loader2 size={18} className="animate-spin text-saffron-400" />
        Загружаем выбор комнаты…
      </div>
    )
  }

  if (cityRoom) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center">
        <h1 className="font-display text-3xl font-bold text-cream-50">Это городская комната</h1>
        <p className="mt-2 text-sm text-cream-300/60">
          Здесь работает маршрут по нескольким ресторанам. Бронирование доступно в комнате
          ресторана.
        </p>
        <Link
          to={`/room/${roomCode}/route`}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-saffron-400 px-5 text-sm font-bold text-ink-950"
        >
          Открыть маршрут
        </Link>
      </div>
    )
  }

  if (selectionQuery.error || !selection || !room || !restaurant) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center">
        <h1 className="font-display text-3xl font-bold text-cream-50">Не удалось открыть выбор</h1>
        <p className="mt-2 text-sm text-cream-300/60">
          {selectionQuery.error instanceof Error
            ? selectionQuery.error.message
            : 'Попробуйте обновить страницу'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => selectionQuery.refetch()}>
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

  const partyDefault = form.party_size || room.participants_count
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
        <Link
          to={`/room/${roomCode}/swipes`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-saffron-300 hover:text-saffron-400"
        >
          <UtensilsCrossed size={16} />
          Продолжить свайпы
        </Link>
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/12 via-transparent to-basil-400/10 p-6 sm:p-8">
          <p className="eyebrow">Выбор компании</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-cream-50">
            {restaurant.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-cream-300/55">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-saffron-400" />
              {restaurant.address || restaurant.city}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-saffron-400" />
              {room.participants_count} участников
            </span>
            <span className="flex items-center gap-1.5">
              <Heart size={13} className="text-tomato-400" />
              {dishes.length} совпадений
            </span>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="font-display text-2xl font-bold text-cream-50">Что совпало</h2>
            <p className="mt-1 text-sm text-cream-300/50">
              Эти блюда понравились нескольким участникам комнаты.
            </p>
            {dishes.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] p-5 text-sm text-cream-300/60">
                Пока нет совпадений. Вернитесь к свайпам — список обновится автоматически.
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {dishes.map((dish) => (
                  <div
                    key={dish.dish_id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cream-100">{dish.name}</p>
                      {dish.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-cream-300/45">
                          {dish.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-saffron-300">{formatPrice(dish.price)}</p>
                      <p className="text-[10px] text-cream-300/40">{dish.likes} лайков</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {booking && !sent ? (
              <div className="rounded-2xl border border-basil-400/20 bg-basil-400/10 p-4 text-sm text-cream-200/75">
                <p className="font-semibold text-basil-400">
                  Бронь уже отправлена · {bookingStatusLabel(booking.status)}
                </p>
                <p className="mt-1 text-xs text-cream-300/55">
                  {formatDate(booking.created_at)}. Можно обновить данные и отправить снова.
                </p>
              </div>
            ) : null}

            {sent || (booking && booking.status !== 'new') ? (
              <div className="mt-4 rounded-3xl border border-basil-400/20 bg-basil-400/[0.08] p-6 text-center">
                <CheckCircle2 className="mx-auto text-basil-400" size={34} />
                <h2 className="mt-3 font-display text-2xl font-bold text-cream-50">
                  {sent ? 'Бронь отправлена' : 'Бронь принята'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                  Ресторан увидит заявку в своём кабинете и свяжется с вами для подтверждения.
                </p>
                <Link
                  to={`/room/${roomCode}`}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100"
                >
                  В комнату
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="flex items-center gap-2 text-saffron-300">
                  <CalendarClock size={18} />
                  <h2 className="font-display text-2xl font-bold text-cream-50">Оставить бронь</h2>
                </div>
                <div>
                  <label htmlFor="booking-name" className="field-label">
                    Имя
                  </label>
                  <Input
                    id="booking-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="booking-phone" className="field-label">
                    Телефон
                  </label>
                  <Input
                    id="booking-phone"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="+7 999 000-00-00"
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-party" className="field-label">
                      Гостей
                    </label>
                    <Input
                      id="booking-party"
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
                    <label htmlFor="booking-time" className="field-label">
                      Когда
                    </label>
                    <Input
                      id="booking-time"
                      type="datetime-local"
                      min={minDate}
                      value={form.requested_at}
                      onChange={(event) => setForm({ ...form, requested_at: event.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="booking-comment" className="field-label">
                    Комментарий
                  </label>
                  <Textarea
                    id="booking-comment"
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
                  {bookingMutation.isPending ? 'Отправляем…' : 'Отправить бронь'}
                </Button>
                <p className="text-center text-xs text-cream-300/35">
                  Это заявка, а не автоматическое подтверждение. Ресторан свяжется с вами.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
