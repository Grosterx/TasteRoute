import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, LockKeyhole, Store } from 'lucide-react'
import { api } from '../lib/api'
import {
  getRestaurantSession,
  saveRestaurantSession,
} from '../lib/restaurantSession'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function RestaurantLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const passwordChanged = Boolean((location.state as { passwordChanged?: boolean } | null)?.passwordChanged)
  const sessionExpired = searchParams.get('expired') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (getRestaurantSession()) {
    return <Navigate to="/restaurant" replace />
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await api.restaurantLogin(email.trim(), password)
      saveRestaurantSession(result)
      navigate('/restaurant', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        to="/for-restaurants"
        className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
      >
        <ArrowLeft size={16} />
        Для ресторанов
      </Link>

      <div className="surface mt-6 overflow-hidden">
        <div className="border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/15 via-transparent to-basil-400/10 p-7 sm:p-9">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
            <Store size={24} />
          </div>
          <p className="eyebrow mt-5">Кабинет ресторана</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50">
            Брони, меню
            <span className="block text-saffron-300">и аналитика</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream-300/60">
            Вход по email и паролю, которые выдал администратор TasteRoute.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 p-7 sm:p-9">
          {passwordChanged || sessionExpired ? (
            <p className="rounded-2xl border border-basil-400/20 bg-basil-400/10 px-4 py-3 text-sm text-basil-400">
              {passwordChanged
                ? 'Пароль обновлён. Войдите с новым паролем.'
                : 'Сессия завершена. Войдите снова.'}
            </p>
          ) : null}
          <div>
            <label htmlFor="restaurant-email" className="field-label">
              Email
            </label>
            <Input
              id="restaurant-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@restaurant.ru"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="restaurant-password" className="field-label">
              Пароль
            </label>
            <Input
              id="restaurant-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 8 символов"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? (
            <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <LockKeyhole size={18} />}
            {busy ? 'Входим…' : 'Войти в кабинет'}
          </Button>
          <p className="text-center text-xs text-cream-300/35">
            Нет доступа? <Link to="/for-restaurants" className="text-saffron-300">Оставьте заявку</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
