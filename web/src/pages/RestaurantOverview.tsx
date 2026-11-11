import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarCheck,
  Eye,
  Loader2,
  QrCode,
  Sparkles,
  Trophy,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { api } from '../lib/api'
import { getRestaurantSession } from '../lib/restaurantSession'
import { bookingStatusLabel, dateDaysAgo, todayISO } from '../lib/restaurant'
import { formatDate } from '../lib/utils'

export function RestaurantOverview() {
  const session = getRestaurantSession()
  const analyticsQuery = useQuery({
    queryKey: ['restaurant-analytics', session?.token, 'overview'],
    queryFn: () => api.restaurantAnalytics(session!.token, dateDaysAgo(29), todayISO()),
    enabled: Boolean(session?.token),
    retry: false,
  })
  const bookingsQuery = useQuery({
    queryKey: ['restaurant-bookings', session?.token, 'overview'],
    queryFn: () => api.restaurantBookings(session!.token),
    enabled: Boolean(session?.token),
    retry: false,
  })
  const dishesQuery = useQuery({
    queryKey: ['restaurant-dishes', session?.token, 'overview'],
    queryFn: () => api.restaurantDishes(session!.token),
    enabled: Boolean(session?.token),
    retry: false,
  })
  const weekQuery = useQuery({
    queryKey: ['restaurant-analytics', session?.token, 'week'],
    queryFn: () => api.restaurantAnalytics(session!.token, dateDaysAgo(6), todayISO()),
    enabled: Boolean(session?.token),
    retry: false,
  })

  if (!session) return <Navigate to="/restaurant/login" replace />

  const summary = analyticsQuery.data?.summary
  const bookings = bookingsQuery.data ?? []
  const dishes = dishesQuery.data ?? []
  const newBookings = bookings.filter((item) => item.status === 'new')
  const topWeekDishes = weekQuery.data?.top_dishes ?? []
  const weekHit = topWeekDishes.reduce<typeof topWeekDishes[number] | null>((best, item) => {
    if (!best) return item
    if (item.matches > best.matches || (item.matches === best.matches && item.likes > best.likes)) {
      return item
    }
    return best
  }, null)
  const weekHitDish = weekHit ? dishes.find((dish) => dish.dish_id === weekHit.dish_id) : null

  const cards = [
    {
      label: 'Просмотры за 30 дней',
      value: summary?.views ?? 0,
      hint: `${summary?.qr_views ?? 0} с QR`,
      icon: Eye,
    },
    {
      label: 'Комнаты гостей',
      value: summary?.rooms ?? 0,
      hint: `${summary?.guests ?? 0} участников`,
      icon: Users,
    },
    {
      label: 'Брони',
      value: summary?.bookings ?? 0,
      hint: `${newBookings.length} новых сейчас`,
      icon: CalendarCheck,
    },
    {
      label: 'Конверсия в бронь',
      value: `${Math.round((summary?.conversion ?? 0) * 100)}%`,
      hint: 'от созданных комнат',
      icon: Sparkles,
    },
  ]

  return (
    <div className="space-y-6">
      {session.restaurant.plan_status === 'trial' ? (
        <div className="surface flex flex-col justify-between gap-4 border-saffron-400/20 bg-saffron-400/[0.06] p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="eyebrow">Бесплатный пилот</p>
            <p className="mt-2 text-sm leading-relaxed text-cream-200/70">
              Вы на бесплатном пилоте. Все функции доступны, оплата не требуется. После первых
              броней можно обсудить тариф.
            </p>
          </div>
          <Link
            to="/restaurant/qr"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-5 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
          >
            <QrCode size={16} />
            Открыть QR
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-cream-300/55">{card.label}</p>
              <card.icon size={16} className="text-saffron-400" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-cream-50">{card.value}</p>
            <p className="mt-1 text-[11px] text-cream-300/40">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Последние брони</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">Заявки гостей</h2>
            </div>
            <Link
              to="/restaurant/bookings"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-300 hover:text-saffron-400"
            >
              Все
              <ArrowRight size={15} />
            </Link>
          </div>

          {bookingsQuery.isLoading ? (
            <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-cream-300/50">
              <Loader2 size={16} className="animate-spin text-saffron-400" />
              Загружаем…
            </div>
          ) : bookings.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-4 py-5 text-sm text-cream-300/55">
              Броней пока нет. Разместите QR на столах и предложите гостям собрать компанию.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {bookings.slice(0, 4).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-cream-100">{booking.name}</p>
                    <p className="text-xs text-cream-300/45">
                      {booking.phone} · {booking.party_size} гостей · {formatDate(booking.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-saffron-400/10 px-2.5 py-1 text-[10px] font-semibold text-saffron-300">
                    {bookingStatusLabel(booking.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {weekHit ? (
            <div className="surface overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-cream-200/[0.07] bg-gradient-to-br from-saffron-500/12 to-transparent p-5 sm:p-6">
                <div>
                  <p className="eyebrow">Хит недели</p>
                  <h3 className="mt-2 font-display text-xl font-bold leading-tight text-cream-50">
                    {weekHit.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-cream-300/50">
                    {weekHit.likes} лайков · {weekHit.matches} совпадений за 7 дней
                  </p>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-saffron-400 text-ink-950">
                  <Trophy size={19} />
                </div>
              </div>
              {weekHitDish?.image_url ? (
                <img
                  src={weekHitDish.image_url}
                  alt={weekHit.name}
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <Link
                to="/restaurant/analytics"
                className="flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-saffron-300 transition hover:text-saffron-400"
              >
                Смотреть аналитику
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : null}
          <div className="surface p-5 sm:p-6">
            <p className="eyebrow">Меню</p>
            <p className="mt-2 font-display text-3xl font-bold text-cream-50">{dishes.length}</p>
            <p className="mt-1 text-xs text-cream-300/45">активных блюд в свайпах</p>
            <Link
              to="/restaurant/menu"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-300 hover:text-saffron-400"
            >
              <UtensilsCrossed size={15} />
              Управлять меню
            </Link>
          </div>
          <div className="surface p-5 sm:p-6">
            <p className="eyebrow">Быстрые действия</p>
            <div className="mt-4 space-y-2 text-sm">
              <Link
                to="/restaurant/qr"
                className="flex items-center justify-between rounded-2xl border border-cream-200/[0.07] px-3 py-2.5 text-cream-200/75 hover:border-saffron-400/30 hover:text-cream-50"
              >
                Скачать QR для столов
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/restaurant/profile"
                className="flex items-center justify-between rounded-2xl border border-cream-200/[0.07] px-3 py-2.5 text-cream-200/75 hover:border-saffron-400/30 hover:text-cream-50"
              >
                Заполнить профиль
                <ArrowRight size={14} />
              </Link>
              <Link
                to={`/places/${session.restaurant.slug}`}
                className="flex items-center justify-between rounded-2xl border border-cream-200/[0.07] px-3 py-2.5 text-cream-200/75 hover:border-saffron-400/30 hover:text-cream-50"
              >
                Посмотреть глазами гостя
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
