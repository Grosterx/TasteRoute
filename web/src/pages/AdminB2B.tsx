import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Inbox,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react'
import { ApiError, api } from '../lib/api'
import type { AdminRestaurant, Restaurant } from '../lib/types'
import { bookingStatusLabel, salesStatusLabel, salesStatusOptions } from '../lib/restaurant'
import { formatDate } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { cn } from '../lib/utils'

const storageKey = 'tasteroute.admin-token'

const tabs = [
  { id: 'overview', label: 'Обзор' },
  { id: 'restaurants', label: 'Рестораны' },
  { id: 'sales', label: 'Заявки' },
  { id: 'bookings', label: 'Брони' },
  { id: 'guests', label: 'Гости' },
] as const

type TabID = (typeof tabs)[number]['id']

export function AdminB2B() {
  const queryClient = useQueryClient()
  const [token, setToken] = useState(() => sessionStorage.getItem(storageKey) ?? '')
  const [tokenInput, setTokenInput] = useState('')
  const [tab, setTab] = useState<TabID>('overview')
  const [createForm, setCreateForm] = useState({
    slug: '',
    name: '',
    city: 'Тольятти',
    cuisine: '',
    address: '',
    phone: '',
    plan: 'pilot',
    plan_status: 'trial',
  })

  const metricsQuery = useQuery({
    queryKey: ['admin-metrics', token],
    queryFn: () => api.adminMetrics(token),
    enabled: Boolean(token),
    retry: false,
  })
  const restaurantsQuery = useQuery({
    queryKey: ['admin-restaurants', token],
    queryFn: () => api.adminRestaurants(token),
    enabled: Boolean(token),
    retry: false,
  })
  const salesQuery = useQuery({
    queryKey: ['admin-sales', token],
    queryFn: () => api.adminSalesLeads(token),
    enabled: Boolean(token),
    retry: false,
  })
  const bookingsQuery = useQuery({
    queryKey: ['admin-bookings', token],
    queryFn: () => api.adminBookings(token),
    enabled: Boolean(token),
    retry: false,
  })
  const leadsQuery = useQuery({
    queryKey: ['admin-leads', token],
    queryFn: () => api.adminLeads(token),
    enabled: Boolean(token),
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: () => api.adminCreateRestaurant(token, createForm as Partial<Restaurant>),
    onSuccess: () => {
      setCreateForm({
        slug: '',
        name: '',
        city: 'Тольятти',
        cuisine: '',
        address: '',
        phone: '',
        plan: 'pilot',
        plan_status: 'trial',
      })
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants', token] })
      queryClient.invalidateQueries({ queryKey: ['admin-metrics', token] })
    },
  })

  const login = (event: FormEvent) => {
    event.preventDefault()
    const value = tokenInput.trim()
    if (!value) return
    sessionStorage.setItem(storageKey, value)
    setToken(value)
    setTokenInput('')
  }

  const logout = () => {
    sessionStorage.removeItem(storageKey)
    setToken('')
    setTokenInput('')
    queryClient.clear()
  }

  const unauthorized = [metricsQuery, restaurantsQuery, salesQuery, bookingsQuery, leadsQuery].some(
    (query) => query.error instanceof ApiError && query.error.status === 401,
  )

  const refreshAll = () => {
    metricsQuery.refetch()
    restaurantsQuery.refetch()
    salesQuery.refetch()
    bookingsQuery.refetch()
    leadsQuery.refetch()
  }

  if (!token || unauthorized) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        {unauthorized ? (
          <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
            Неверный админ-токен. Введите его заново.
          </p>
        ) : null}
        <form onSubmit={login} className="surface space-y-4 p-6 sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-cream-50">B2B-панель</h1>
            <p className="mt-1 text-sm text-cream-300/60">
              Рестораны, заявки на подключение, брони и метрики. Используется тот же `ADMIN_TOKEN`.
            </p>
          </div>
          <Input
            type="password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Админ-токен"
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={!tokenInput.trim()}>
            Открыть панель
          </Button>
          <Link to="/admin" className="block text-center text-xs text-cream-300/45 hover:text-cream-100">
            Перейти к заявкам гостей
          </Link>
        </form>
      </div>
    )
  }

  const metrics = metricsQuery.data
  const restaurants = restaurantsQuery.data ?? []
  const sales = salesQuery.data ?? []
  const bookings = bookingsQuery.data ?? []
  const leads = leadsQuery.data ?? []
  const restaurantNames = new Map(restaurants.map((item) => [item.id, item.name]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">TasteRoute · B2B</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-cream-50">Партнёрская панель</h1>
          <p className="mt-2 text-sm text-cream-300/60">
            Пилот: подключаем вручную, без платежей и внешних CRM.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={refreshAll}>
            <RefreshCw size={15} />
            Обновить
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut size={15} />
            Выйти
          </Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-cream-200/[0.07] bg-cream-50/[0.02] p-1.5">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition',
              tab === item.id
                ? 'bg-saffron-400/15 text-saffron-200'
                : 'text-cream-300/55 hover:text-cream-50',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {metricsQuery.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center gap-3 text-sm text-cream-300/60">
          <Loader2 size={18} className="animate-spin text-saffron-400" />
          Загружаем данные…
        </div>
      ) : tab === 'overview' ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Рестораны', value: metrics?.restaurants ?? 0, hint: `${metrics?.active_restaurants ?? 0} активных`, icon: Store },
              { label: 'На пилоте', value: metrics?.trials ?? 0, hint: 'бесплатный период', icon: Building2 },
              { label: 'Комнаты гостей', value: metrics?.rooms ?? 0, hint: 'всего создано', icon: Users },
              { label: 'Брони', value: metrics?.bookings ?? 0, hint: 'заявки на стол', icon: CalendarCheck },
              { label: 'B2B-заявки', value: metrics?.sales_leads ?? 0, hint: 'лиды с лендинга', icon: Inbox },
              { label: 'Заявки гостей', value: leads.length, hint: 'по маршрутам', icon: Users },
            ].map((card) => (
              <div key={card.label} className="surface p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-cream-300/55">{card.label}</p>
                  <card.icon size={16} className="text-saffron-400" />
                </div>
                <p className="mt-3 font-display text-3xl font-bold text-cream-50">{card.value}</p>
                <p className="mt-1 text-[11px] text-cream-300/40">{card.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-cream-50">Новые B2B-заявки</h2>
                <button
                  type="button"
                  onClick={() => setTab('sales')}
                  className="text-xs font-semibold text-saffron-300 hover:text-saffron-400"
                >
                  Все
                </button>
              </div>
              {sales.length === 0 ? (
                <p className="mt-4 text-sm text-cream-300/50">Заявок пока нет.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {sales.slice(0, 5).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between rounded-xl border border-cream-200/[0.07] px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-cream-100">{lead.restaurant_name}</p>
                        <p className="text-xs text-cream-300/40">
                          {lead.contact_name} · {lead.phone}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-saffron-300">
                        {salesStatusLabel(lead.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-cream-50">Свежие брони</h2>
                <button
                  type="button"
                  onClick={() => setTab('bookings')}
                  className="text-xs font-semibold text-saffron-300 hover:text-saffron-400"
                >
                  Все
                </button>
              </div>
              {bookings.length === 0 ? (
                <p className="mt-4 text-sm text-cream-300/50">Броней пока нет.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {bookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-xl border border-cream-200/[0.07] px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-cream-100">{booking.name}</p>
                        <p className="text-xs text-cream-300/40">
                          {restaurantNames.get(booking.restaurant_id) ?? 'Ресторан'} · {booking.party_size} гостей
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-basil-400">
                        {bookingStatusLabel(booking.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : tab === 'restaurants' ? (
        <div className="space-y-5">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              createMutation.mutate()
            }}
            className="surface p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 text-saffron-300">
              <Plus size={18} />
              <h2 className="font-display text-2xl font-bold text-cream-50">Подключить ресторан</h2>
            </div>
            <p className="mt-2 text-sm text-cream-300/55">
              После создания добавьте аккаунт и передайте доступ ресторану вручную.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                placeholder="Название *"
                value={createForm.name}
                onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                required
              />
              <Input
                placeholder="slug (латиницей)"
                value={createForm.slug}
                onChange={(event) => setCreateForm({ ...createForm, slug: event.target.value })}
              />
              <Input
                placeholder="Город"
                value={createForm.city}
                onChange={(event) => setCreateForm({ ...createForm, city: event.target.value })}
              />
              <Input
                placeholder="Кухня"
                value={createForm.cuisine}
                onChange={(event) => setCreateForm({ ...createForm, cuisine: event.target.value })}
              />
              <Input
                placeholder="Адрес"
                value={createForm.address}
                onChange={(event) => setCreateForm({ ...createForm, address: event.target.value })}
              />
              <Input
                placeholder="Телефон"
                value={createForm.phone}
                onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })}
              />
              <select
                value={createForm.plan}
                onChange={(event) => setCreateForm({ ...createForm, plan: event.target.value })}
                className="h-11 rounded-2xl border border-cream-200/10 bg-ink-850 px-4 text-sm text-cream-100"
              >
                <option value="pilot">pilot</option>
                <option value="basic">basic</option>
                <option value="pro">pro</option>
              </select>
              <select
                value={createForm.plan_status}
                onChange={(event) => setCreateForm({ ...createForm, plan_status: event.target.value })}
                className="h-11 rounded-2xl border border-cream-200/10 bg-ink-850 px-4 text-sm text-cream-100"
              >
                <option value="trial">trial</option>
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="cancelled">cancelled</option>
              </select>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Создать
              </Button>
            </div>
            {createMutation.error ? (
              <p className="mt-3 text-sm text-tomato-400">
                {createMutation.error instanceof Error ? createMutation.error.message : 'Не удалось создать ресторан'}
              </p>
            ) : null}
            {createMutation.isSuccess ? (
              <p className="mt-3 text-sm text-basil-400">Ресторан создан. Добавьте аккаунт ниже.</p>
            ) : null}
          </form>

          <div className="space-y-3">
            {restaurants.map((item) => (
              <RestaurantAdminCard key={item.id} token={token} restaurant={item} />
            ))}
          </div>
        </div>
      ) : tab === 'sales' ? (
        <div className="space-y-3">
          {sales.length === 0 ? (
            <div className="surface p-8 text-center text-sm text-cream-300/50">Заявок пока нет.</div>
          ) : (
            sales.map((lead) => (
              <div key={lead.id} className="surface p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <h2 className="break-words font-display text-2xl font-bold text-cream-50">
                      {lead.restaurant_name}
                    </h2>
                    <p className="mt-1 text-sm text-cream-300/60">
                      {lead.contact_name} · {lead.phone}
                      {lead.email ? ` · ${lead.email}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-cream-300/40">
                      {lead.city || 'Город не указан'} · {formatDate(lead.created_at)}
                    </p>
                  </div>
                  <SalesStatusSelect token={token} id={lead.id} status={lead.status} />
                </div>
                {lead.message ? (
                  <p className="mt-4 rounded-xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-3 py-2 text-sm text-cream-200/70">
                    {lead.message}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : tab === 'bookings' ? (
        <div className="space-y-2">
          {bookings.length === 0 ? (
            <div className="surface p-8 text-center text-sm text-cream-300/50">Броней пока нет.</div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="surface flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="break-words font-display text-xl font-bold text-cream-50">
                    {booking.name}
                  </p>
                  <p className="break-words text-sm text-cream-300/55">
                    {booking.phone} · {booking.party_size} гостей · {restaurantNames.get(booking.restaurant_id) ?? ''}
                  </p>
                  <p className="mt-1 text-xs text-cream-300/35">
                    Комната {booking.room_code} · {formatDate(booking.created_at)}
                  </p>
                </div>
                <span className="self-start rounded-full bg-saffron-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-saffron-300 sm:self-auto">
                  {bookingStatusLabel(booking.status)}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-300 hover:text-saffron-400"
            >
              Открыть полные заявки гостей
              <ArrowUpRight size={15} />
            </Link>
          </div>
          {leads.length === 0 ? (
            <div className="surface p-8 text-center text-sm text-cream-300/50">Заявок пока нет.</div>
          ) : (
            leads.map((lead) => (
              <div key={lead.id} className="surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-cream-100">{lead.name}</p>
                    <p className="break-words text-sm text-cream-300/50">
                      {lead.phone} · комната {lead.room_code}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-cream-300/40">
                    {formatDate(lead.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function RestaurantAdminCard({ token, restaurant }: { token: string; restaurant: AdminRestaurant }) {
  const queryClient = useQueryClient()
  const [plan, setPlan] = useState(restaurant.plan || 'pilot')
  const [status, setStatus] = useState(restaurant.plan_status || 'trial')
  const [email, setEmail] = useState(restaurant.accounts[0]?.email ?? '')
  const [password, setPassword] = useState('')
  const [accountMessage, setAccountMessage] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: () => api.adminUpdateRestaurant(token, restaurant.id, { plan, plan_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants', token] })
      queryClient.invalidateQueries({ queryKey: ['admin-metrics', token] })
    },
  })

  const accountMutation = useMutation({
    mutationFn: () => api.adminSetRestaurantAccount(token, restaurant.id, { email, password }),
    onSuccess: (account) => {
      setPassword('')
      setAccountMessage(`Аккаунт ${account.email} сохранён. Передайте пароль ресторану.`)
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants', token] })
    },
  })

  return (
    <div className="surface p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words font-display text-2xl font-bold text-cream-50">
              {restaurant.name}
            </h2>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                restaurant.active ? 'bg-basil-400/10 text-basil-400' : 'bg-tomato-500/10 text-tomato-400',
              )}
            >
              {restaurant.active ? 'active' : 'hidden'}
            </span>
          </div>
          <p className="mt-1 break-words text-xs text-cream-300/40">
            /places/{restaurant.slug} · {restaurant.city} · {restaurant.cuisine || 'кухня не указана'}
          </p>
        </div>
        <Link
          to={`/places/${restaurant.slug}`}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-saffron-300 hover:text-saffron-400"
        >
          Страница
          <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-cream-200/[0.07] p-4">
          <p className="text-[10px] uppercase tracking-wider text-cream-300/35">Тариф</p>
          <div className="mt-2 flex gap-2">
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              className="h-10 flex-1 rounded-xl border border-cream-200/10 bg-ink-850 px-3 text-sm text-cream-100"
            >
              <option value="pilot">pilot</option>
              <option value="basic">basic</option>
              <option value="pro">pro</option>
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 flex-1 rounded-xl border border-cream-200/10 bg-ink-850 px-3 text-sm text-cream-100"
            >
              <option value="trial">trial</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="cancelled">cancelled</option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              OK
            </Button>
          </div>
          {updateMutation.error ? (
            <p className="mt-2 text-xs text-tomato-400">
              {updateMutation.error instanceof Error ? updateMutation.error.message : 'Ошибка'}
            </p>
          ) : null}
          <p className="mt-3 break-all text-xs text-cream-300/40">
            Аккаунты:{' '}
            {restaurant.accounts.length > 0
              ? restaurant.accounts.map((account) => account.email).join(', ')
              : 'нет'}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            setAccountMessage(null)
            if (password.length < 8) {
              setAccountMessage('Пароль должен быть не короче 8 символов')
              return
            }
            accountMutation.mutate()
          }}
          className="rounded-2xl border border-cream-200/[0.07] p-4"
        >
          <p className="text-[10px] uppercase tracking-wider text-cream-300/35">Доступ в кабинет</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Input
              type="email"
              placeholder="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10"
              required
            />
            <Input
              type="password"
              placeholder="пароль (8+)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10"
              required
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            className="mt-2 w-full"
            disabled={accountMutation.isPending}
          >
            {accountMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {restaurant.accounts.length > 0 ? 'Сбросить пароль' : 'Создать аккаунт'}
          </Button>
          {accountMutation.error ? (
            <p className="mt-2 text-xs text-tomato-400">
              {accountMutation.error instanceof Error ? accountMutation.error.message : 'Ошибка'}
            </p>
          ) : null}
          {accountMessage ? <p className="mt-2 text-xs text-basil-400">{accountMessage}</p> : null}
        </form>
      </div>
    </div>
  )
}

function SalesStatusSelect({ token, id, status }: { token: string; id: string; status: string }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (next: string) => api.adminUpdateSalesLead(token, id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sales', token] })
      queryClient.invalidateQueries({ queryKey: ['admin-metrics', token] })
    },
  })
  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(event) => mutation.mutate(event.target.value)}
        disabled={mutation.isPending}
        className="h-9 rounded-xl border border-cream-200/10 bg-ink-850 px-3 text-xs text-cream-100"
      >
        {salesStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {mutation.isPending ? <Loader2 size={14} className="animate-spin text-saffron-400" /> : null}
    </div>
  )
}
