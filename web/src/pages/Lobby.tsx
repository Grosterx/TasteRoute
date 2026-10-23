import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Link2, MapPinned, Route, Users } from 'lucide-react'
import { api, shareURL } from '../lib/api'
import { getSession } from '../lib/session'
import { useRoomSocket } from '../lib/useRoomSocket'
import { RoomChrome } from '../components/RoomChrome'
import { Button } from '../components/ui/Button'

export function Lobby() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const session = getSession()
  const roomQuery = useQuery({
    queryKey: ['room', roomCode],
    queryFn: () => api.getRoom(roomCode),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
  })
  const socket = useRoomSocket(roomCode, session?.token)
  const participants = socket.participants || roomQuery.data?.participants_count || 1

  if (!session || session.roomCode !== roomCode) {
    return <Navigate to={`/r/${roomCode}`} replace />
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow">Комната готова</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
          Привет, {session.name}.
          <span className="block text-saffron-300">Позовите своих.</span>
        </h1>
      </div>

      <RoomChrome code={roomCode} participants={participants} connected={socket.connected} />

      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="surface p-6">
          <div className="flex items-center gap-2 text-saffron-300">
            <Link2 size={18} />
            <h2 className="font-display text-xl font-bold">Ссылка для друзей</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
            Отправьте ссылку в чат. Друзья откроют её, введут имя и сразу попадут в комнату.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-cream-200/10 bg-ink-850 p-2 pl-4">
            <span className="min-w-0 flex-1 truncate text-xs text-cream-200/55">
              {shareURL(roomCode)}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigator.clipboard?.writeText(shareURL(roomCode))}
            >
              Копировать
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={`/room/${roomCode}/swipes`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
            >
              Начать свайпы
              <ArrowRight size={17} />
            </Link>
            <Link
              to={`/room/${roomCode}/route`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cream-200/15 bg-cream-50/[0.04] px-6 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
            >
              <Route size={17} />
              Маршрут
            </Link>
          </div>
        </div>

        <div className="surface p-6">
          <div className="flex items-center gap-2 text-basil-400">
            <Users size={18} />
            <h2 className="font-display text-xl font-bold">Кто в комнате</h2>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-2xl border border-cream-200/10 bg-cream-50/[0.03] px-4 py-3 text-sm">
              <span className="font-medium text-cream-100">{session.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-saffron-400">вы</span>
            </div>
            {Array.from({ length: Math.max(0, participants - 1) }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-2xl border border-cream-200/[0.06] px-4 py-3 text-sm text-cream-300/50"
              >
                <span>Участник {index + 2}</span>
                <span className="text-[10px] uppercase tracking-wider">онлайн</span>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-cream-300/40">
            <MapPinned size={14} className="text-saffron-400" />
            {roomQuery.data?.city ?? 'Тольятти'}
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-cream-300/35">
        Свайпы сохраняются автоматически. Можно начинать, даже если кто-то ещё заходит.
      </p>
    </div>
  )
}
