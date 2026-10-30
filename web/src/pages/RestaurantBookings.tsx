import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, Loader2, Phone, Users } from 'lucide-react'
import { api } from '../lib/api'
import { getRestaurantSession } from '../lib/restaurantSession'
import {
  bookingStatusLabel,
  bookingStatusOptions,
  sourceLabel,
} from '../lib/restaurant'
import { formatDate } from '../lib/utils'
import { Button } from '../components/ui/Button'

export function RestaurantBookings() {
  const session = getRestaurantSession()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const bookingsQuery = useQuery({
    queryKey: ['restaurant-bookings', session?.token, status],
    queryFn: () => api.restaurantBookings(session!.token, status || undefined),
    enabled: Boolean(session?.token),
    retry: false,
    refetchInterval: 30_000,
  })
  const updateMutation = useMutation({
    mutationFn: ({ bookingID, nextStatus }: { bookingID: string; nextStatus: string }) =>
      api.updateRestaurantBooking(session!.token, bookingID, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['restaurant-analytics'] })
    },
  })

  if (!session) return <Navigate to="/restaurant/login" replace />

  const bookings = bookingsQuery.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Брони</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-cream-50">Заявки гостей</h1>
          <p className="mt-2 text-sm text-cream-300/60">
            Подтвердите бронь или свяжитесь с гостем. Список обновляется автоматически.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => bookingsQuery.refetch()}>
          Обновить
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            status === ''
              ? 'bg-saffron-400/15 text-saffron-200'
              : 'border border-cream-200/10 text-cream-300/60 hover:text-cream-50'
          }`}
        >
          Все
        </button>
        {bookingStatusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              status === option.value
                ? 'bg-saffron-400/15 text-saffron-200'
                : 'border border-cream-200/10 text-cream-300/60 hover:text-cream-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {bookingsQuery.isLoading ? (
        <div className="flex min-h-[35vh] items-center justify-center gap-3 text-sm text-cream-300/60">
          <Loader2 size={18} className="animate-spin text-saffron-400" />
          Загружаем брони…
        </div>
      ) : bookingsQuery.error ? (
        <div className="surface p-7 text-center">
          <p className="text-sm text-tomato-400">
            {bookingsQuery.error instanceof Error ? bookingsQuery.error.message : 'Не удалось загрузить брони'}
          </p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="surface p-8 text-center">
          <CalendarCheck className="mx-auto text-cream-300/30" size={34} />
          <h2 className="mt-3 font-display text-2xl font-bold text-cream-50">Пока пусто</h2>
          <p className="mt-2 text-sm text-cream-300/55">
            Как только гость оставит бронь, она появится здесь.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <article key={booking.id} className="surface p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words font-display text-2xl font-bold text-cream-50">
                      {booking.name}
                    </h2>
                    <span className="rounded-full bg-saffron-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-saffron-300">
                      {bookingStatusLabel(booking.status)}
                    </span>
                    <span className="rounded-full bg-cream-50/[0.04] px-2.5 py-1 text-[10px] text-cream-300/55">
                      {sourceLabel(booking.source)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-cream-200/70">
                    <a
                      href={`tel:${booking.phone}`}
                      className="flex items-center gap-1.5 break-all hover:text-cream-50"
                    >
                      <Phone size={14} className="text-saffron-400" />
                      {booking.phone}
                    </a>
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-saffron-400" />
                      {booking.party_size} гостей
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck size={14} className="text-saffron-400" />
                      {booking.requested_at ? formatDate(booking.requested_at) : 'время не указано'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-cream-300/40">
                    Комната {booking.room_code} · создана {formatDate(booking.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={updateMutation.isPending || booking.status === 'contacted'}
                    onClick={() =>
                      updateMutation.mutate({ bookingID: booking.id, nextStatus: 'contacted' })
                    }
                  >
                    В работу
                  </Button>
                  <Button
                    size="sm"
                    disabled={updateMutation.isPending || booking.status === 'confirmed'}
                    onClick={() =>
                      updateMutation.mutate({ bookingID: booking.id, nextStatus: 'confirmed' })
                    }
                  >
                    Подтвердить
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={updateMutation.isPending || booking.status === 'declined'}
                    onClick={() =>
                      updateMutation.mutate({ bookingID: booking.id, nextStatus: 'declined' })
                    }
                  >
                    Отклонить
                  </Button>
                </div>
              </div>

              {booking.comment ? (
                <p className="mt-4 rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-4 py-3 text-sm leading-relaxed text-cream-200/70">
                  {booking.comment}
                </p>
              ) : null}

              {booking.dishes.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {booking.dishes.map((dish) => (
                    <span
                      key={dish.dish_id}
                      className="break-words rounded-full border border-cream-200/10 px-2.5 py-1 text-[11px] text-cream-200/65"
                    >
                      {dish.name}
                    </span>
                  ))}
                </div>
              ) : null}

              {updateMutation.error ? (
                <p className="mt-3 text-xs text-tomato-400">
                  {updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : 'Не удалось обновить статус'}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
