import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarCheck,
  Link2,
  MapPinned,
  Route as RouteIcon,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { api, shareURL } from '../lib/api'
import { getSession } from '../lib/session'
import { bookingStatusLabel, chainStatusLabel, isActiveBookingStatus } from '../lib/restaurant'
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
  const room = roomQuery.data
  const restaurantMode = room?.mode === 'restaurant'
  const shareLink = shareURL(roomCode)
  const summaryQuery = useQuery({
    queryKey: ['room-summary', roomCode],
    queryFn: () => api.roomSummary(roomCode, session!.token),
    enabled: Boolean(session && session.roomCode === roomCode),
    retry: false,
    refetchInterval: 15_000,
  })
  const activeChain =
    summaryQuery.data?.chain &&
    isActiveBookingStatus(summaryQuery.data.chain.status)
      ? summaryQuery.data.chain
      : null
  const activeBooking =
    summaryQuery.data?.booking && isActiveBookingStatus(summaryQuery.data.booking.status)
      ? summaryQuery.data.booking
      : null

  if (!session || session.roomCode !== roomCode) {
    return <Navigate to={`/r/${roomCode}`} replace />
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow">
          {restaurantMode ? `Комната · ${room?.restaurant_name ?? 'ресторан'}` : 'Городская комната'}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
          Привет, {session.name}.
          <span className="block text-saffron-300">
            {restaurantMode ? 'Выберите блюда вместе.' : 'Позовите своих.'}
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-300/60">
          {restaurantMode
            ? 'Свайпайте меню ресторана. Совпавшие блюда попадут в общий выбор, а затем — в одну бронь на всю компанию.'
            : 'В колоде 30 блюд из ресторанов города. Когда совпадения появятся, выберите один ресторан и забронируйте стол на всю компанию.'}
        </p>
      </div>

      <RoomChrome code={roomCode} participants={participants} connected={socket.connected} />

      {activeChain ? (
        <Link
          to={`/room/${roomCode}/evening`}
          className="surface flex items-center justify-between gap-4 p-5 transition hover:border-basil-400/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-basil-400/15 text-basil-400">
              <RouteIcon size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-basil-400">
                Вечер по маршруту · {chainStatusLabel(activeChain.status)}
              </p>
              <p className="mt-0.5 truncate font-display text-lg font-bold text-cream-50">
                {activeChain.stops.map((stop) => stop.restaurant_name).join(' → ')}
              </p>
              <p className="mt-0.5 text-xs text-cream-300/45">
                {activeChain.stops.length} точки · {activeChain.party_size} гостей
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="shrink-0 text-basil-400" />
        </Link>
      ) : activeBooking ? (
        <Link
          to={restaurantMode ? `/room/${roomCode}/booking` : `/room/${roomCode}/choice`}
          className="surface flex items-center justify-between gap-4 p-5 transition hover:border-saffron-400/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
              <CalendarCheck size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-saffron-300">
                Бронь · {bookingStatusLabel(activeBooking.status)}
              </p>
              <p className="mt-0.5 truncate font-display text-lg font-bold text-cream-50">
                {activeBooking.restaurant_name ||
                  room?.restaurant_name ||
                  'Ресторан компании'}
              </p>
              <p className="mt-0.5 text-xs text-cream-300/45">
                {activeBooking.party_size} гостей
                {activeBooking.requested_at
                  ? ` · ${new Date(activeBooking.requested_at).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''}
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="shrink-0 text-saffron-400" />
        </Link>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="surface p-6">
          <div className="flex items-center gap-2 text-saffron-300">
            <Link2 size={18} />
            <h2 className="font-display text-xl font-bold">Ссылка для друзей</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
            Отправьте ссылку в чат. Друзья откроют её, введут имя и сразу попадут в комнату.
          </p>
          <div className="mt-4 flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-cream-200/10 bg-ink-850 p-2 pl-4 sm:flex-row sm:items-center">
            <span
              className="min-w-0 w-full break-all text-xs leading-relaxed text-cream-200/55 sm:w-auto sm:flex-1 sm:truncate"
              title={shareLink}
            >
              {shareLink}
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => navigator.clipboard?.writeText(shareLink)}
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
            {restaurantMode ? (
              <Link
                to={`/room/${roomCode}/booking`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cream-200/15 bg-cream-50/[0.04] px-6 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
              >
                <CalendarCheck size={17} />
                К брони
              </Link>
            ) : (
              <Link
                to={`/room/${roomCode}/choice`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cream-200/15 bg-cream-50/[0.04] px-6 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
              >
                <UtensilsCrossed size={17} />
                Выбрать ресторан
              </Link>
            )}
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
            {restaurantMode ? room?.restaurant_name : room?.city || 'Город не выбран'}
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-cream-300/35">
        Свайпы сохраняются автоматически. Можно начинать, даже если кто-то ещё заходит.
      </p>
    </div>
  )
}
