import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { findFunResult } from '../lib/fun'
import { saveSession } from '../lib/session'
import { useUserCity } from '../lib/useUserCity'
import { CityPicker } from '../components/CityPicker'
import { FunIconGlyph } from '../components/FunIcon'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function CreateRoom() {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { city } = useUserCity()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const vibe = findFunResult(searchParams.get('fun'), searchParams.get('result'))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Как вас зовут?')
      return
    }
    if (!city) {
      setError('Выберите город, чтобы собрать комнату')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const room = await api.createRoom(city)
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
          <p className="eyebrow">Новая городская комната</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50">
            Кто идёт
            <br />
            за вкусом?
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream-300/60">
            Комната из всех ресторанов города. Вы станете организатором — останется отправить
            друзьям ссылку.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6 p-7 sm:p-9">
          <div className="rounded-2xl border border-cream-200/10 bg-ink-850 px-4 py-3">
            <CityPicker showHint />
          </div>

          {vibe ? (
            <div className="flex items-start gap-3 rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.06] px-4 py-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-saffron-400/15 text-saffron-300">
                <FunIconGlyph name={vibe.icon} size={19} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-saffron-300/70">
                  Вайб маршрута
                </p>
                <p className="mt-1 font-display text-lg font-bold leading-tight text-cream-50">
                  {vibe.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-cream-300/55">
                  Соберём комнату под это настроение — друзья подключатся по ссылке.
                </p>
              </div>
            </div>
          ) : null}

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

          <Button type="submit" size="lg" className="w-full" disabled={busy || !city}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {busy ? 'Создаём комнату…' : 'Создать комнату'}
          </Button>
        </form>
      </div>
    </div>
  )
}
