import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { api } from '../lib/api'
import {
  clearRestaurantSession,
  getRestaurantSession,
  updateRestaurantSession,
} from '../lib/restaurantSession'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'

export function RestaurantProfile() {
  const navigate = useNavigate()
  const session = getRestaurantSession()
  const [form, setForm] = useState({
    name: session?.restaurant.name ?? '',
    description: session?.restaurant.description ?? '',
    address: session?.restaurant.address ?? '',
    cuisine: session?.restaurant.cuisine ?? '',
    phone: session?.restaurant.phone ?? '',
    website: session?.restaurant.website ?? '',
    hours: session?.restaurant.hours ?? '',
    image_url: session?.restaurant.image_url ?? '',
    cover_url: session?.restaurant.cover_url ?? '',
  })
  const [message, setMessage] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    repeat: '',
  })
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: () => api.updateRestaurantProfile(session!.token, form),
    onSuccess: (updated) => {
      updateRestaurantSession(updated)
      setMessage('Профиль сохранён')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.changeRestaurantPassword(
        session!.token,
        passwordForm.current_password,
        passwordForm.new_password,
      ),
    onSuccess: () => {
      clearRestaurantSession()
      navigate('/restaurant/login', { replace: true, state: { passwordChanged: true } })
    },
  })

  if (!session) return <Navigate to="/restaurant/login" replace />

  const submitProfile = (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    saveMutation.mutate()
  }

  const submitPassword = (event: FormEvent) => {
    event.preventDefault()
    setPasswordMessage(null)
    if (passwordForm.new_password.length < 8) {
      setPasswordMessage('Новый пароль должен быть не короче 8 символов')
      return
    }
    if (passwordForm.new_password !== passwordForm.repeat) {
      setPasswordMessage('Пароли не совпадают')
      return
    }
    passwordMutation.mutate()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="surface p-5 sm:p-6">
        <p className="eyebrow">Публичная страница</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-cream-50">Профиль ресторана</h1>
        <p className="mt-2 text-sm text-cream-300/60">
          Эти данные видят гости на странице ресторана и в QR-сценарии.
        </p>

        <form onSubmit={submitProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="field-label">
              Название
            </label>
            <Input
              id="profile-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="profile-cuisine" className="field-label">
              Кухня
            </label>
            <Input
              id="profile-cuisine"
              value={form.cuisine}
              onChange={(event) => setForm({ ...form, cuisine: event.target.value })}
              placeholder="итальянская"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="profile-description" className="field-label">
              Описание
            </label>
            <Textarea
              id="profile-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={1000}
            />
          </div>
          <div>
            <label htmlFor="profile-address" className="field-label">
              Адрес
            </label>
            <Input
              id="profile-address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="profile-hours" className="field-label">
              Часы работы
            </label>
            <Input
              id="profile-hours"
              value={form.hours}
              onChange={(event) => setForm({ ...form, hours: event.target.value })}
              placeholder="Ежедневно 12:00–23:00"
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="field-label">
              Телефон
            </label>
            <Input
              id="profile-phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="profile-website" className="field-label">
              Сайт
            </label>
            <Input
              id="profile-website"
              value={form.website}
              onChange={(event) => setForm({ ...form, website: event.target.value })}
              placeholder="https://…"
            />
          </div>
          <div>
            <label htmlFor="profile-image" className="field-label">
              URL обложки
            </label>
            <Input
              id="profile-image"
              value={form.image_url}
              onChange={(event) => setForm({ ...form, image_url: event.target.value })}
              placeholder="https://…"
            />
          </div>
          <div>
            <label htmlFor="profile-cover" className="field-label">
              URL фона
            </label>
            <Input
              id="profile-cover"
              value={form.cover_url}
              onChange={(event) => setForm({ ...form, cover_url: event.target.value })}
              placeholder="https://…"
            />
          </div>

          {saveMutation.error ? (
            <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400 sm:col-span-2">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Не удалось сохранить профиль'}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-2xl border border-basil-400/20 bg-basil-400/10 px-4 py-3 text-sm text-basil-400 sm:col-span-2">
              {message}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Сохранить профиль
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <div className="surface p-5 sm:p-6">
          <p className="eyebrow">Доступ</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">Сменить пароль</h2>
          <p className="mt-2 text-xs leading-relaxed text-cream-300/50">
            Email: {session.account.email}
          </p>
          <form onSubmit={submitPassword} className="mt-5 space-y-3">
            <div>
              <label htmlFor="current-password" className="field-label">
                Текущий пароль
              </label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.current_password}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, current_password: event.target.value })
                }
                required
              />
            </div>
            <div>
              <label htmlFor="new-password" className="field-label">
                Новый пароль
              </label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.new_password}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, new_password: event.target.value })
                }
                required
              />
            </div>
            <div>
              <label htmlFor="repeat-password" className="field-label">
                Повторите пароль
              </label>
              <Input
                id="repeat-password"
                type="password"
                value={passwordForm.repeat}
                onChange={(event) => setPasswordForm({ ...passwordForm, repeat: event.target.value })}
                required
              />
            </div>
            {passwordMutation.error ? (
              <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                {passwordMutation.error instanceof Error
                  ? passwordMutation.error.message
                  : 'Не удалось изменить пароль'}
              </p>
            ) : null}
            {passwordMessage ? (
              <p className="rounded-2xl border border-basil-400/20 bg-basil-400/10 px-4 py-3 text-sm text-basil-400">
                {passwordMessage}
              </p>
            ) : null}
            <Button type="submit" variant="secondary" className="w-full" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Обновить пароль
            </Button>
          </form>
        </div>

        <div className="surface p-5 text-xs leading-relaxed text-cream-300/45">
          Если нужно изменить тариф, slug или восстановить доступ — напишите администратору
          TasteRoute. В пилоте это делает человек, без платёжных форм.
        </div>
      </div>
    </div>
  )
}
