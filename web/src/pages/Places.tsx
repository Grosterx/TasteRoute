import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Loader2, MapPin, Store, Utensils } from 'lucide-react'
import { api } from '../lib/api'
import { cuisineGradient } from '../lib/utils'

export function Places() {
  const restaurantsQuery = useQuery({
    queryKey: ['public-restaurants', 'Тольятти'],
    queryFn: () => api.publicRestaurants('Тольятти'),
    retry: false,
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Рестораны рядом</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
            Выберите место,
            <span className="block text-saffron-300">а компания выберет блюда</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-300/60">
            Откройте меню ресторана, создайте комнату и отправьте ссылку друзьям. Совпавшие блюда
            сразу превращаются в заявку на бронь.
          </p>
        </div>
        <Link
          to="/for-restaurants"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-cream-200/15 bg-cream-50/[0.04] px-5 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
        >
          <Store size={16} />
          Подключить ресторан
        </Link>
      </div>

      {restaurantsQuery.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center gap-3 text-sm text-cream-300/60">
          <Loader2 size={18} className="animate-spin text-saffron-400" />
          Загружаем рестораны…
        </div>
      ) : restaurantsQuery.error ? (
        <div className="surface mx-auto max-w-xl p-7 text-center">
          <h2 className="font-display text-2xl font-bold text-cream-50">Не удалось загрузить список</h2>
          <p className="mt-2 text-sm text-cream-300/60">
            {restaurantsQuery.error instanceof Error ? restaurantsQuery.error.message : 'Попробуйте ещё раз'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(restaurantsQuery.data ?? []).map((restaurant) => (
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
