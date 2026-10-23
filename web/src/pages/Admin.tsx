import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Inbox, Loader2, LogOut, MapPin, Phone, RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const storageKey = 'tasteroute.admin-token'

export function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(storageKey) ?? '')
  const [tokenInput, setTokenInput] = useState('')
  const leadsQuery = useQuery({
    queryKey: ['admin-leads', token],
    queryFn: () => api.adminLeads(token),
    enabled: Boolean(token),
    retry: false,
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
  }

  const unauthorized =
    leadsQuery.error instanceof Error && leadsQuery.error.message.includes('админ-токен')

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Для организатора</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-cream-50">Заявки гостей</h1>
          <p className="mt-2 text-sm text-cream-300/60">
            Контакты и маршруты, которые собрали комнаты. Без Telegram и внешних сервисов.
          </p>
        </div>
        {token ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => leadsQuery.refetch()}>
              <RefreshCw size={15} />
              Обновить
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut size={15} />
              Выйти
            </Button>
          </div>
        ) : null}
      </div>

      {!token ? (
        <form onSubmit={login} className="surface mx-auto max-w-md space-y-4 p-6 sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-cream-50">Вход в панель</h2>
            <p className="mt-1 text-sm text-cream-300/60">
              Введите `ADMIN_TOKEN`, который задан в переменных окружения API.
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
            Открыть заявки
          </Button>
        </form>
      ) : leadsQuery.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center gap-3 text-sm text-cream-300/60">
          <Loader2 size={18} className="animate-spin text-saffron-400" />
          Загружаем заявки…
        </div>
      ) : leadsQuery.error ? (
        <div className="surface mx-auto max-w-lg p-7 text-center">
          <p className="text-sm text-tomato-400">
            {unauthorized ? 'Неверный админ-токен.' : 'Не удалось загрузить заявки.'}
          </p>
          <Button variant="secondary" className="mt-5" onClick={logout}>
            Ввести другой токен
          </Button>
        </div>
      ) : leadsQuery.data && leadsQuery.data.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {leadsQuery.data.map((lead) => (
            <article key={lead.id} className="surface p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-saffron-400">
                    Комната {lead.room_code}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-cream-50">{lead.name}</h2>
                </div>
                <span className="rounded-full bg-basil-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-basil-400">
                  {lead.status}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-cream-200/70">
                <p className="flex items-center gap-2">
                  <Phone size={14} className="text-saffron-400" />
                  {lead.phone}
                </p>
                <p className="text-xs text-cream-300/40">{formatDate(lead.created_at)}</p>
                {lead.comment ? (
                  <p className="rounded-xl border border-cream-200/[0.07] bg-cream-50/[0.025] px-3 py-2 text-xs leading-relaxed">
                    {lead.comment}
                  </p>
                ) : null}
              </div>
              {lead.route?.stops?.length ? (
                <div className="mt-4 space-y-1.5 border-t border-cream-200/10 pt-4">
                  {lead.route.stops.map((stop, index) => (
                    <p key={stop.restaurant_id} className="flex items-start gap-2 text-xs text-cream-300/55">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-saffron-400/15 text-[9px] font-bold text-saffron-300">
                        {index + 1}
                      </span>
                      <span>
                        <span className="font-medium text-cream-200/80">{stop.name}</span>
                        <span className="mt-0.5 flex items-center gap-1">
                          <MapPin size={10} />
                          {stop.address}
                        </span>
                      </span>
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="surface mx-auto max-w-lg p-8 text-center">
          <Inbox className="mx-auto text-cream-300/30" size={34} />
          <h2 className="mt-3 font-display text-2xl font-bold text-cream-50">Пока пусто</h2>
          <p className="mt-2 text-sm text-cream-300/55">
            Как только кто-то оставит заявку на маршруте, она появится здесь.
          </p>
        </div>
      )}
    </div>
  )
}
