import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Heart, Loader2, Route, WifiOff } from 'lucide-react'
import { api } from '../lib/api'
import { getSession } from '../lib/session'
import { useRoomSocket } from '../lib/useRoomSocket'
import type { Match } from '../lib/types'
import { MatchOverlay } from '../components/MatchOverlay'
import { RoomChrome } from '../components/RoomChrome'
import { SwipeCard } from '../components/SwipeCard'
import { Button } from '../components/ui/Button'

export function Swipes() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const session = getSession()
  const [index, setIndex] = useState(0)
  const [activeMatch, setActiveMatch] = useState<Match | null>(null)

  const roomQuery = useQuery({
    queryKey: ['room', roomCode],
    queryFn: () => api.getRoom(roomCode),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
  })
  const catalogQuery = useQuery({
    queryKey: ['catalog', roomCode],
    queryFn: () => api.catalog(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
  })
  const socket = useRoomSocket(roomCode, session?.token)
  const catalog = catalogQuery.data ?? []
  const current = catalog[index]
  const matchDish = activeMatch ? catalog.find((dish) => dish.dish_id === activeMatch.dish_id) : null
  const participants = socket.participants || roomQuery.data?.participants_count || 1

  useEffect(() => {
    if (socket.lastMatch) setActiveMatch(socket.lastMatch)
  }, [socket.lastMatch])

  if (!session || session.roomCode !== roomCode) {
    return <Navigate to={`/r/${roomCode}`} replace />
  }

  const swipe = (liked: boolean) => {
    if (!current) return false
    if (!socket.sendSwipe(current.dish_id, liked)) {
      setActiveMatch(null)
      return false
    }
    setIndex((value) => value + 1)
    return true
  }

  const restart = () => {
    setIndex(0)
    setActiveMatch(null)
  }

  if (catalogQuery.isLoading || roomQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-cream-300/60">
        <Loader2 size={18} className="animate-spin text-saffron-400" />
        Собираем блюда…
      </div>
    )
  }

  if (catalogQuery.error) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center">
        <WifiOff className="mx-auto text-tomato-400" size={28} />
        <h1 className="mt-4 font-display text-2xl font-bold text-cream-50">Каталог не загрузился</h1>
        <p className="mt-2 text-sm text-cream-300/60">
          {catalogQuery.error instanceof Error ? catalogQuery.error.message : 'Попробуйте ещё раз'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => catalogQuery.refetch()}>
            Повторить
          </Button>
          <Link
            to={`/r/${roomCode}`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100"
          >
            Войти заново
          </Link>
        </div>
      </div>
    )
  }

  if (catalog.length === 0) {
    return (
      <div className="surface mx-auto max-w-xl p-7 text-center">
        <WifiOff className="mx-auto text-saffron-400" size={28} />
        <h1 className="mt-4 font-display text-2xl font-bold text-cream-50">Каталог пуст</h1>
        <p className="mt-2 text-sm text-cream-300/60">
          Похоже, демо-данные ещё не загружены. Запустите seed и обновите страницу.
        </p>
        <Button className="mt-6" variant="secondary" onClick={() => catalogQuery.refetch()}>
          Обновить
        </Button>
      </div>
    )
  }

  const progress = Math.round((Math.min(index, catalog.length) / catalog.length) * 100)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/room/${roomCode}`}
          className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
        >
          <ArrowLeft size={16} />
          В комнату
        </Link>
        <Link
          to={`/room/${roomCode}/route`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-saffron-300 transition hover:text-saffron-400"
        >
          <Route size={16} />
          Маршрут
        </Link>
      </div>

      <RoomChrome code={roomCode} participants={participants} connected={socket.connected} />

      {!socket.connected ? (
        <p className="rounded-2xl border border-saffron-400/15 bg-saffron-400/[0.06] px-4 py-3 text-xs text-saffron-300/80">
          Соединение восстанавливается. Свайпы снова станут доступны через пару секунд.
        </p>
      ) : null}

      <div className="flex items-center justify-between text-xs text-cream-300/45">
        <span>
          {Math.min(index, catalog.length)} / {catalog.length} блюд
        </span>
        <span className="flex items-center gap-1.5">
          <Heart size={13} className="text-tomato-400" />
          {socket.matches.length} совпадений
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-cream-50/[0.06]">
        <div
          className="h-full rounded-full bg-saffron-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="rounded-3xl px-1 py-2">
        {current ? (
          <SwipeCard key={current.dish_id} dish={current} onSwipe={swipe} disabled={!socket.connected} />
        ) : (
          <div className="surface mx-auto max-w-[430px] p-7 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-basil-400/15 text-basil-400">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="mt-5 font-display text-3xl font-bold text-cream-50">Колода пройдена</h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
              Вы посмотрели все блюда. Если совпадений уже достаточно, собирайте маршрут.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                to={`/room/${roomCode}/route`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
              >
                <Route size={17} />
                Собрать маршрут
              </Link>
              <Button variant="secondary" onClick={restart}>
                Пройти заново
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-cream-300/35">
        Вправо — «хочу», влево — «мимо». Свайпы видны всей комнате.
      </p>

      <MatchOverlay
        open={Boolean(activeMatch)}
        dishName={matchDish?.name}
        likes={activeMatch?.likes ?? 0}
        onClose={() => setActiveMatch(null)}
      />
    </div>
  )
}
