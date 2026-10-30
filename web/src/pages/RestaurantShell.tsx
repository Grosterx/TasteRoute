import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  QrCode,
  Store,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react'
import { ApiError, api } from '../lib/api'
import {
  clearRestaurantSession,
  getRestaurantSession,
  saveRestaurantSession,
} from '../lib/restaurantSession'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/Button'

const tabs = [
  { to: '/restaurant', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/restaurant/bookings', label: 'Брони', icon: CalendarCheck },
  { to: '/restaurant/menu', label: 'Меню', icon: UtensilsCrossed },
  { to: '/restaurant/analytics', label: 'Аналитика', icon: BarChart3 },
  { to: '/restaurant/qr', label: 'QR', icon: QrCode },
  { to: '/restaurant/profile', label: 'Профиль', icon: UserRound },
]

function tabClass({ isActive }: { isActive: boolean }) {
  return cn(
    'inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-saffron-400/15 text-saffron-200'
      : 'text-cream-300/60 hover:bg-cream-50/[0.05] hover:text-cream-50',
  )
}

export function RestaurantShell() {
  const navigate = useNavigate()
  const [session] = useState(getRestaurantSession)
  const meQuery = useQuery({
    queryKey: ['restaurant-me', session?.token],
    queryFn: () => api.restaurantMe(session!.token),
    enabled: Boolean(session?.token),
    retry: false,
  })

  const unauthorized = meQuery.error instanceof ApiError && meQuery.error.status === 401

  useEffect(() => {
    if (!session || !meQuery.data) return
    saveRestaurantSession({
      token: session.token,
      account: meQuery.data.account,
      restaurant: meQuery.data.restaurant,
    })
  }, [meQuery.data, session])

  useEffect(() => {
    if (!unauthorized) return
    clearRestaurantSession()
  }, [unauthorized])

  if (!session || unauthorized) {
    return <Navigate to="/restaurant/login" replace />
  }

  const restaurant = meQuery.data?.restaurant ?? session.restaurant
  const account = meQuery.data?.account ?? session.account
  const trial = restaurant.plan_status === 'trial'

  const logout = () => {
    clearRestaurantSession()
    navigate('/restaurant/login', { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/10 via-transparent to-basil-400/10 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-saffron-400 text-ink-950">
              <Store size={23} />
            </div>
            <div className="min-w-0">
              <p className="eyebrow">Кабинет ресторана</p>
              <h1 className="mt-1 break-words font-display text-3xl font-bold leading-tight text-cream-50">
                {restaurant.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-cream-300/50">
                <span className="break-all">{account.email}</span>
                <span className="text-cream-300/25">·</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 font-semibold uppercase tracking-wider',
                    trial
                      ? 'bg-saffron-400/10 text-saffron-300'
                      : 'bg-basil-400/10 text-basil-400',
                  )}
                >
                  {restaurant.plan || 'pilot'} · {restaurant.plan_status || 'trial'}
                </span>
                <Link to={`/places/${restaurant.slug}`} className="text-saffron-300 hover:text-saffron-200">
                  публичная страница
                </Link>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="self-start sm:self-auto">
            <LogOut size={15} />
            Выйти
          </Button>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-3">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClass}>
              <tab.icon size={15} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {meQuery.error && !unauthorized ? (
        <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
          Не удалось обновить данные кабинета. Показываем сохранённую версию.
        </p>
      ) : null}

      <Outlet />
    </div>
  )
}
