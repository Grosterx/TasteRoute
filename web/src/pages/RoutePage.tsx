import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Route, Send, Utensils } from 'lucide-react'
import { ApiError, api } from '../lib/api'
import { getSession } from '../lib/session'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'

export function RoutePage() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const session = getSession()
  const [name, setName] = useState(session?.name ?? '')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)

  const routeQuery = useQuery({
    queryKey: ['route', roomCode],
    queryFn: () => api.route(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
  })

  if (!session || session.roomCode !== roomCode) {
    return <Navigate to={`/r/${roomCode}`} replace />
  }

  const submitLead = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setLeadError(null)
    try {
      await api.createLead(session.token, { name: name.trim(), phone: phone.trim(), comment: comment.trim() })
      setSent(true)
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Не удалось отправить заявку')
    } finally {
      setBusy(false)
    }
  }

  const notEnough = routeQuery.error instanceof ApiError && routeQuery.error.status === 409

  if (routeQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-cream-300/60">
        <Loader2 size={18} className="animate-spin text-saffron-400" />
        Собираем маршрут…
      </div>
    )
  }

  if (notEnough) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center sm:p-9">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
          <Route size={28} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold text-cream-50">Нужно больше совпадений</h1>
        <p className="mt-3 text-sm leading-relaxed text-cream-300/60">
          Для маршрута нужны минимум два совпадения в разных ресторанах. Продолжайте свайпать —
          маршрут появится, как только вкусы сойдутся.
        </p>
        <Link
          to={`/room/${roomCode}/swipes`}
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
        >
          Вернуться к свайпам
        </Link>
      </div>
    )
  }

  if (routeQuery.error || !routeQuery.data) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center">
        <h1 className="font-display text-2xl font-bold text-cream-50">Маршрут не собрался</h1>
        <p className="mt-2 text-sm text-cream-300/60">
          {routeQuery.error instanceof Error ? routeQuery.error.message : 'Попробуйте ещё раз'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => routeQuery.refetch()}>
            Повторить
          </Button>
          <Link
            to={`/room/${roomCode}/swipes`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100"
          >
            К свайпам
          </Link>
        </div>
      </div>
    )
  }

  const route = routeQuery.data
  const dishCount = route.stops.reduce((total, stop) => total + stop.dishes.length, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <Link
        to={`/room/${roomCode}`}
        className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
      >
        <ArrowLeft size={16} />
        В комнату
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Маршрут готов</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
            {route.stops.length} остановки,
            <span className="block text-saffron-300">один вкусный вечер</span>
          </h1>
        </div>
        <div className="flex gap-3 text-xs text-cream-300/55">
          <span className="rounded-full border border-cream-200/10 px-3 py-1.5">
            {route.stops.length} ресторана
          </span>
          <span className="rounded-full border border-cream-200/10 px-3 py-1.5">
            {dishCount} блюд
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {route.stops.map((stop, index) => (
            <div key={stop.restaurant_id} className="surface relative p-5 sm:p-6">
              <div className="flex gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-saffron-400 text-lg font-black text-ink-950">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-display text-2xl font-bold leading-tight text-cream-50">
                      {stop.name}
                    </h2>
                    {index < route.stops.length - 1 ? (
                      <span className="rounded-full bg-basil-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-basil-400">
                        далее
                      </span>
                    ) : (
                      <span className="rounded-full bg-saffron-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-saffron-300">
                        финиш
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-cream-300/50">
                    <MapPin size={13} className="text-saffron-400" />
                    {stop.address}
                  </p>
                  <div className="mt-4 space-y-2">
                    {stop.dishes.map((dish) => (
                      <div
                        key={dish.dish_id}
                        className="flex items-center gap-2 rounded-xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-3 py-2 text-sm text-cream-200/75"
                      >
                        <Utensils size={13} className="text-saffron-400" />
                        {dish.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="surface p-6">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-basil-400/15 text-basil-400">
                  <CheckCircle2 size={28} />
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold text-cream-50">Заявка принята</h2>
                <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                  Она уже в панели организатора. В демо-режиме ресторан не получает уведомление —
                  это следующий шаг после MVP.
                </p>
                <Link
                  to={`/room/${roomCode}`}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100"
                >
                  В комнату
                </Link>
              </div>
            ) : (
              <form onSubmit={submitLead} className="space-y-4">
                <div>
                  <p className="eyebrow">Финальный шаг</p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">
                    Оставить заявку
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                    Организатор увидит контакт в админ-панели и сможет забронировать стол.
                  </p>
                </div>
                <div>
                  <label htmlFor="lead-name" className="field-label">
                    Имя
                  </label>
                  <Input
                    id="lead-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lead-phone" className="field-label">
                    Телефон
                  </label>
                  <Input
                    id="lead-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+7 999 000-00-00"
                    maxLength={40}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lead-comment" className="field-label">
                    Комментарий
                  </label>
                  <Textarea
                    id="lead-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Во сколько планируете, сколько вас…"
                    maxLength={500}
                  />
                </div>
                {leadError ? (
                  <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                    {leadError}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  {busy ? 'Отправляем…' : 'Отправить заявку'}
                </Button>
              </form>
            )}
          </div>
          <p className="px-2 text-xs leading-relaxed text-cream-300/35">
            Все точки маршрута упорядочены от центра города по кратчайшему расстоянию.
          </p>
        </div>
      </div>
    </div>
  )
}
