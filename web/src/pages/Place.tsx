import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Globe2,
  Loader2,
  MapPin,
  Phone,
  QrCode,
  Users,
  Utensils,
} from 'lucide-react'
import { api } from '../lib/api'
import { saveSession } from '../lib/session'
import { cuisineGradient, formatPrice } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const trackedViews = new Set<string>()

export function Place() {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const source = searchParams.get('src') === 'qr' ? 'qr' : 'direct'

  const restaurantQuery = useQuery({
    queryKey: ['public-restaurant', slug],
    queryFn: () => api.publicRestaurant(slug),
    enabled: Boolean(slug),
    retry: false,
  })

  useEffect(() => {
    if (!slug) return
    const key = `${slug}:${source}`
    if (trackedViews.has(key)) return
    trackedViews.add(key)
    api.trackRestaurantView(slug, source).catch(() => undefined)
  }, [slug, source])

  const start = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Введите имя, чтобы друзья узнали вас в комнате')
      return
    }
    const restaurant = restaurantQuery.data
    if (!restaurant) return
    setBusy(true)
    setError(null)
    try {
      const room = await api.createRoom({
        city: restaurant.city,
        restaurantSlug: restaurant.slug,
        source: source === 'qr' ? 'qr' : 'place',
      })
      const joined = await api.joinRoom(room.code, name.trim())
      saveSession({
        participantId: joined.participant_id,
        token: joined.token,
        name: joined.name,
        roomCode: room.code,
      })
      navigate(`/room/${room.code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать комнату')
      setBusy(false)
    }
  }

  if (restaurantQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-cream-300/60">
        <Loader2 size={18} className="animate-spin text-saffron-400" />
        Открываем ресторан…
      </div>
    )
  }

  if (restaurantQuery.error || !restaurantQuery.data) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center">
        <h1 className="font-display text-3xl font-bold text-cream-50">Ресторан не найден</h1>
        <p className="mt-2 text-sm text-cream-300/60">
          Возможно, ссылка устарела или ресторан временно скрыт.
        </p>
        <Link
          to="/places"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100"
        >
          Все рестораны
        </Link>
      </div>
    )
  }

  const restaurant = restaurantQuery.data
  const groups = restaurant.dishes.reduce<Record<string, typeof restaurant.dishes>>((acc, dish) => {
    const key = dish.category || 'Меню'
    acc[key] = acc[key] ?? []
    acc[key].push(dish)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <Link
        to="/places"
        className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
      >
        <ArrowLeft size={16} />
        Все рестораны
      </Link>

      <div className="surface overflow-hidden">
        <div
          className={`relative flex min-h-56 items-end bg-gradient-to-br ${cuisineGradient(
            restaurant.cuisine,
          )} p-7 sm:p-9`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/10 to-transparent" />
          <div className="relative max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                {restaurant.cuisine || 'ресторан'}
              </span>
              {source === 'qr' ? (
                <span className="flex items-center gap-1 rounded-full bg-black/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                  <QrCode size={11} />
                  QR на столе
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
              {restaurant.name}
            </h1>
            {restaurant.description ? (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
                {restaurant.description}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/65">
              {restaurant.address ? (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} />
                  {restaurant.address}
                </span>
              ) : null}
              {restaurant.hours ? (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {restaurant.hours}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-saffron-300">
            <Utensils size={18} />
            <h2 className="font-display text-2xl font-bold">Меню</h2>
            <span className="text-xs text-cream-300/40">{restaurant.dishes.length} блюд</span>
          </div>
          {Object.entries(groups).map(([category, dishes]) => (
            <div key={category} className="surface p-5 sm:p-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-400">
                {category}
              </h3>
              <div className="mt-4 space-y-3">
                {dishes.map((dish) => (
                  <div
                    key={dish.dish_id}
                    className="flex items-start justify-between gap-4 border-b border-cream-200/[0.06] pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-cream-100">{dish.name}</p>
                      {dish.description ? (
                        <p className="mt-1 text-xs leading-relaxed text-cream-300/55">
                          {dish.description}
                        </p>
                      ) : null}
                      {dish.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {dish.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-cream-50/[0.05] px-2 py-0.5 text-[10px] text-cream-300/55"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-display text-lg font-bold text-saffron-300">
                      {formatPrice(dish.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="surface p-6">
            <div className="flex items-center gap-2 text-saffron-300">
              <Users size={18} />
              <h2 className="font-display text-xl font-bold">Собрать компанию</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
              Создайте комнату, отправьте ссылку друзьям и выберите блюда вместе. Когда совпадения
              появятся, вы оставите бронь.
            </p>
            <form onSubmit={start} className="mt-5 space-y-3">
              <div>
                <label htmlFor="starter-name" className="field-label">
                  Ваше имя
                </label>
                <Input
                  id="starter-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Как вас зовут?"
                  maxLength={40}
                />
              </div>
              {error ? (
                <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
                {busy ? 'Создаём комнату…' : 'Создать комнату'}
              </Button>
            </form>
          </div>

          <div className="surface space-y-3 p-6 text-sm text-cream-200/70">
            {restaurant.phone ? (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 hover:text-cream-50">
                <Phone size={15} className="text-saffron-400" />
                {restaurant.phone}
              </a>
            ) : null}
            {restaurant.website ? (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-cream-50"
              >
                <Globe2 size={15} className="text-saffron-400" />
                Сайт ресторана
              </a>
            ) : null}
            <Link
              to={`/places/${restaurant.slug}`}
              className="flex items-center justify-between rounded-2xl border border-cream-200/10 bg-cream-50/[0.03] px-3 py-2 text-xs text-cream-300/60"
            >
              <span className="flex items-center gap-1.5">
                <QrCode size={13} />
                Ссылка для QR
              </span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
