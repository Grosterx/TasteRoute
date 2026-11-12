import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, List, Loader2, Map as MapIcon, MapPin, Utensils } from 'lucide-react'
import { api } from '../lib/api'
import { cuisineGradient } from '../lib/utils'
import { useUserCity } from '../lib/useUserCity'
import { CityPicker } from '../components/CityPicker'
import { RouteMap } from '../components/RouteMap'

type ViewMode = 'list' | 'map'

export function Places() {
  const { city } = useUserCity()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>('map')
  const restaurantsQuery = useQuery({
    queryKey: ['public-restaurants', city],
    queryFn: () => api.publicRestaurants(city),
    enabled: Boolean(city),
    retry: false,
  })
  const restaurants = restaurantsQuery.data ?? []
  const mapPoints = restaurants.map((restaurant) => ({
    id: restaurant.id,
    name: restaurant.name,
    address: restaurant.address || restaurant.city,
    lat: restaurant.lat,
    lon: restaurant.lon,
    href: `/places/${restaurant.slug}`,
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Рестораны города</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
            Меню конкретного места
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-300/60">
            Выберите ресторан, откройте меню и создайте комнату. Друзья подключатся по ссылке, а
            совпавшие блюда сразу превратятся в бронь.
          </p>
        </div>
      </div>

      <div className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <CityPicker />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setView('list')}
            className={
              view === 'list'
                ? 'inline-flex items-center gap-1.5 rounded-xl bg-saffron-400 px-3 py-2 text-xs font-bold text-ink-950'
                : 'inline-flex items-center gap-1.5 rounded-xl border border-cream-200/12 px-3 py-2 text-xs font-semibold text-cream-200/75 transition hover:bg-cream-50/[0.06]'
            }
          >
            <List size={14} />
            Списком
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            className={
              view === 'map'
                ? 'inline-flex items-center gap-1.5 rounded-xl bg-saffron-400 px-3 py-2 text-xs font-bold text-ink-950'
                : 'inline-flex items-center gap-1.5 rounded-xl border border-cream-200/12 px-3 py-2 text-xs font-semibold text-cream-200/75 transition hover:bg-cream-50/[0.06]'
            }
          >
            <MapIcon size={14} />
            На карте
          </button>
        </div>
      </div>

      {restaurantsQuery.isLoading || !city ? (
        <div className="flex min-h-[30vh] items-center justify-center gap-3 text-sm text-cream-300/60">
          <Loader2 size={18} className="animate-spin text-saffron-400" />
          {city ? 'Загружаем рестораны…' : 'Определяем город…'}
        </div>
      ) : restaurantsQuery.error ? (
        <div className="surface mx-auto max-w-xl p-7 text-center">
          <h2 className="font-display text-2xl font-bold text-cream-50">Не удалось загрузить список</h2>
          <p className="mt-2 text-sm text-cream-300/60">
            {restaurantsQuery.error instanceof Error ? restaurantsQuery.error.message : 'Попробуйте ещё раз'}
          </p>
        </div>
      ) : restaurants.length === 0 ? (
        <div className="surface mx-auto max-w-xl p-7 text-center">
          <h2 className="font-display text-2xl font-bold text-cream-50">В этом городе пока нет ресторанов</h2>
          <p className="mt-2 text-sm text-cream-300/60">
            Выберите другой город в переключателе выше или соберите комнату из всех ресторанов.
          </p>
          <Link
            to="/create"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-saffron-400 px-5 text-sm font-bold text-ink-950"
          >
            Создать комнату
          </Link>
        </div>
      ) : view === 'map' ? (
        <div className="surface overflow-hidden p-4 sm:p-5">
          <RouteMap
            points={mapPoints}
            numbered={false}
            onSelect={(id) => {
              const restaurant = restaurants.find((item) => item.id === id)
              if (restaurant) navigate(`/places/${restaurant.slug}`)
            }}
          />
          <p className="mt-3 text-xs text-cream-300/40">
            Нажмите на точку, чтобы открыть меню ресторана.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              to={`/places/${restaurant.slug}`}
              className="surface group overflow-hidden transition hover:-translate-y-0.5 hover:border-saffron-400/25"
            >
              <div
                className={`relative flex h-36 items-end bg-gradient-to-br ${cuisineGradient(
                  restaurant.cuisine,
                )} p-5`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
                    {restaurant.cuisine || 'ресторан'}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold leading-tight text-white">
                    {restaurant.name}
                  </h2>
                </div>
              </div>
              <div className="space-y-2 p-5">
                <p className="flex items-center gap-2 text-xs text-cream-300/55">
                  <MapPin size={13} className="text-saffron-400" />
                  {restaurant.address || restaurant.city}
                </p>
                {restaurant.hours ? (
                  <p className="text-xs text-cream-300/45">{restaurant.hours}</p>
                ) : null}
                <p className="flex items-center justify-between pt-2 text-sm font-semibold text-saffron-300">
                  <span className="flex items-center gap-1.5">
                    <Utensils size={14} />
                    Открыть меню
                  </span>
                  <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
