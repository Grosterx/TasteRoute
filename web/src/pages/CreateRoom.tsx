import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, MapPin, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { saveSession } from '../lib/session'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function CreateRoom() {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Как вас зовут?')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const room = await api.createRoom('Тольятти')
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
        <div className="relative border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/15 via-transparent to-basil-400/10 p-7 sm:p-9">
          <div className="absolute right-6 top-6 text-saffron-400/20">
            <Sparkles size={54} />
          </div>
          <p className="eyebrow">Новая комната</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50">
            Кто идёт
            <br />
            за вкусом?
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream-300/60">
            Вы станете организатором. После создания останется отправить друзьям ссылку.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6 p-7 sm:p-9">
          <div className="flex items-center gap-2 rounded-2xl border border-cream-200/10 bg-ink-850 px-4 py-3 text-sm text-cream-200/70">
            <MapPin size={17} className="text-saffron-400" />
            Тольятти
            <span className="ml-auto text-xs text-cream-300/40">город MVP</span>
          </div>

          <div>
            <label htmlFor="name" className="field-label">
              Ваше имя
            </label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например, Аня"
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
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {busy ? 'Создаём комнату…' : 'Создать комнату'}
          </Button>
        </form>
      </div>
    </div>
  )
}
