import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Eye, Loader2, QrCode, Users, UtensilsCrossed } from 'lucide-react'
import { api } from '../lib/api'
import { getRestaurantSession } from '../lib/restaurantSession'
import { dateDaysAgo, sourceLabel, todayISO } from '../lib/restaurant'
import { Input } from '../components/ui/Input'

export function RestaurantAnalytics() {
  const session = getRestaurantSession()
  const [from, setFrom] = useState(dateDaysAgo(29))
  const [to, setTo] = useState(todayISO())
  const analyticsQuery = useQuery({
    queryKey: ['restaurant-analytics', session?.token, from, to],
    queryFn: () => api.restaurantAnalytics(session!.token, from, to),
    enabled: Boolean(session?.token && from && to),
    retry: false,
  })

  if (!session) return <Navigate to="/restaurant/login" replace />

  const data = analyticsQuery.data
  const summary = data?.summary
  const maxDaily = Math.max(
    1,
    ...(data?.daily ?? []).map((item) => Math.max(item.views, item.rooms, item.bookings)),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Аналитика</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-cream-50">Что происходит с гостями</h1>
          <p className="mt-2 text-sm text-cream-300/60">
            Просмотры страницы, комнаты, совпадения и брони за выбранный период.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:flex sm:items-end">
          <div>
            <label htmlFor="analytics-from" className="field-label">
              С
            </label>
            <Input
              id="analytics-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-10 w-full sm:w-40"
            />
          </div>
          <div>
            <label htmlFor="analytics-to" className="field-label">
              По
            </label>
            <Input
              id="analytics-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-10 w-full sm:w-40"
            />
          </div>
        </div>
      </div>

      {analyticsQuery.isLoading ? (
        <div className="flex min-h-[35vh] items-center justify-center gap-3 text-sm text-cream-300/60">
          <Loader2 size={18} className="animate-spin text-saffron-400" />
          Считаем аналитику…
        </div>
      ) : analyticsQuery.error ? (
        <div className="surface p-7 text-center">
          <p className="text-sm text-tomato-400">
            {analyticsQuery.error instanceof Error ? analyticsQuery.error.message : 'Не удалось загрузить аналитику'}
          </p>
        </div>
      ) : data && summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Просмотры', value: summary.views, hint: `${summary.qr_views} с QR`, icon: Eye },
              { label: 'Комнаты', value: summary.rooms, hint: `${summary.guests} участников`, icon: Users },
              { label: 'Совпадения', value: summary.matches, hint: 'блюда, которые выбрали вместе', icon: UtensilsCrossed },
              { label: 'Брони', value: summary.bookings, hint: `${summary.confirmed} подтверждено`, icon: BarChart3 },
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

          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="surface p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="eyebrow">График</p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">По дням</h2>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-cream-300/45">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-saffron-400" />
                    просмотры
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-basil-400" />
                    комнаты
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-tomato-400" />
                    брони
                  </span>
                </div>
              </div>
              {data.daily.length === 0 ? (
                <p className="mt-6 text-sm text-cream-300/50">Нет данных за период.</p>
              ) : (
                <div className="mt-6 flex h-48 items-end gap-1.5 overflow-x-auto pb-1">
                  {data.daily.map((day) => (
                    <div key={day.date} className="flex min-w-2 flex-1 flex-col items-center gap-1">
                      <div className="flex h-40 w-full items-end justify-center gap-px">
                        <div
                          className="w-1/3 rounded-t bg-saffron-400/80"
                          style={{ height: `${(day.views / maxDaily) * 100}%` }}
                          title={`${day.date}: ${day.views} просмотров`}
                        />
                        <div
                          className="w-1/3 rounded-t bg-basil-400/80"
                          style={{ height: `${(day.rooms / maxDaily) * 100}%` }}
                          title={`${day.date}: ${day.rooms} комнат`}
                        />
                        <div
                          className="w-1/3 rounded-t bg-tomato-400/80"
                          style={{ height: `${(day.bookings / maxDaily) * 100}%` }}
                          title={`${day.date}: ${day.bookings} броней`}
                        />
                      </div>
                      <span className="hidden text-[8px] text-cream-300/30 sm:block">
                        {day.date.slice(8)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="surface p-5 sm:p-6">
                <div className="flex items-center gap-2 text-saffron-300">
                  <QrCode size={17} />
                  <h2 className="font-display text-xl font-bold">Источники</h2>
                </div>
                <div className="mt-4 space-y-2">
                  {data.sources.length === 0 ? (
                    <p className="text-sm text-cream-300/50">Пока нет переходов.</p>
                  ) : (
                    data.sources.map((source) => (
                      <div
                        key={source.source}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cream-200/[0.07] px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 break-words text-cream-200/70">
                          {sourceLabel(source.source)}
                        </span>
                        <span className="text-right text-xs text-cream-300/45">
                          {source.rooms} комнат · {source.views} просмотров
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="surface p-5 text-xs leading-relaxed text-cream-300/45">
                Конверсия в бронь: <span className="font-semibold text-saffron-300">{Math.round(summary.conversion * 100)}%</span>.
                Считается как брони, делённые на созданные комнаты за период.
              </div>
            </div>
          </div>

          <div className="surface p-5 sm:p-6">
            <p className="eyebrow">Топ блюд</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">Что выбирают чаще</h2>
            {data.top_dishes.length === 0 ? (
              <p className="mt-4 text-sm text-cream-300/50">Пока нет свайпов за период.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-cream-300/40">
                    <tr>
                      <th className="pb-2 font-medium">Блюдо</th>
                      <th className="pb-2 text-right font-medium">Лайки</th>
                      <th className="pb-2 text-right font-medium">Совпадения</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_dishes.map((dish) => (
                      <tr key={dish.dish_id} className="border-t border-cream-200/[0.06]">
                        <td className="break-words py-2.5 pr-3 text-cream-200/75">{dish.name}</td>
                        <td className="py-2.5 text-right text-saffron-300">{dish.likes}</td>
                        <td className="py-2.5 text-right text-basil-400">{dish.matches}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
