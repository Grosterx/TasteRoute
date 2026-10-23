import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, MapPin, Users } from 'lucide-react'
import { api } from '../lib/api'
import { getSession, saveSession } from '../lib/session'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function JoinRoom() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const session = getSession()
  const isCurrentRoom = session?.roomCode === roomCode

  const roomQuery = useQuery({
    queryKey: ['room', roomCode],
    queryFn: () => api.getRoom(roomCode),
    enabled: roomCode.length >= 4,
    retry: false,
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Как вас зовут?')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const joined = await api.joinRoom(roomCode, name.trim())
      saveSession({
        participantId: joined.participant_id,
        token: joined.token,
        name: joined.name,
        roomCode,
      })
      navigate(`/room/${roomCode}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти в комнату')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
      >
        <ArrowLeft size={16} />
        На главную
      </Link>

      <div className="surface mt-6 overflow-hidden">
        <div className="relative border-b border-cream-200/10 bg-gradient-to-br from-basil-400/10 via-transparent to-saffron-500/10 p-7 sm:p-9">
          <p className="eyebrow">Приглашение</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50">
            Вас ждут
            <br />
            за общим столом
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-cream-200/65">
            <span className="rounded-full border border-cream-200/10 bg-cream-50/[0.04] px-3 py-1.5 font-display text-lg tracking-[0.16em] text-saffron-300">
              {roomCode || '—'}
            </span>
            {roomQuery.data ? (
              <>
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-saffron-400" />
                  {roomQuery.data.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={15} className="text-basil-400" />
                  {roomQuery.data.participants_count} / 8
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="p-7 sm:p-9">
          {roomQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-cream-300/60">
              <Loader2 size={17} className="animate-spin" />
              Проверяем комнату…
            </div>
          ) : roomQuery.error ? (
            <div className="space-y-4">
              <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                {roomQuery.error instanceof Error ? roomQuery.error.message : 'Комната не найдена'}
              </p>
              <Button variant="secondary" onClick={() => navigate('/')}>
                На главную
              </Button>
            </div>
          ) : isCurrentRoom ? (
            <div className="space-y-4">
              <p className="text-sm text-cream-200/70">
                Вы уже в этой комнате как <strong className="text-cream-50">{session.name}</strong>.
              </p>
              <Button className="w-full" onClick={() => navigate(`/room/${roomCode}`)}>
                Вернуться в комнату
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <div>
                <label htmlFor="name" className="field-label">
                  Как вас зовут?
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Имя, которое увидят друзья"
                  maxLength={40}
                  autoFocus
                />
              </div>

              {error ? (
                <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400">
                  {error}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
                {busy ? 'Заходим…' : 'Войти в комнату'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
