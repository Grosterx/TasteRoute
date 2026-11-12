import { Loader2, LocateFixed, MapPin } from 'lucide-react'
import { cn } from '../lib/utils'
import { useUserCity } from '../lib/useUserCity'

type CityPickerProps = {
  compact?: boolean
  showHint?: boolean
  className?: string
}

export function CityPicker({ compact = false, showHint = false, className }: CityPickerProps) {
  const { city, cities, setCity, detectCity, locating, error, isLoading } = useUserCity()
  const names = cities.map((item) => item.name)
  if (city && !names.includes(city)) names.unshift(city)
  const canSwitch = names.length > 1

  const select = (
    <select
      aria-label="Город"
      value={city}
      onChange={(event) => setCity(event.target.value)}
      disabled={isLoading || names.length === 0}
      className={cn(
        'border border-cream-200/12 bg-ink-900/80 font-medium text-cream-100 outline-none transition focus:border-saffron-400/70 disabled:opacity-50',
        compact
          ? 'max-w-[9.5rem] rounded-xl px-3 py-1.5 text-xs'
          : 'h-11 rounded-2xl px-4 text-sm',
      )}
    >
      {names.length === 0 ? <option value="">Город…</option> : null}
      {names.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  )

  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2 text-xs text-cream-300/55', className)}>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={13} className="text-saffron-400" />
          Ваш город:
          <strong className="font-semibold text-cream-100">{city || 'не выбран'}</strong>
        </span>
        {canSwitch ? select : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-saffron-400/25 bg-gradient-to-r from-saffron-500/[0.14] via-saffron-500/[0.05] to-transparent p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-saffron-400 text-ink-950 shadow-glow">
            <MapPin size={22} strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-saffron-300/80">
              Ваш город
            </p>
            <p className="mt-0.5 font-display text-xl font-bold leading-tight text-cream-50 sm:text-2xl">
              {isLoading ? 'Определяем…' : city || 'не выбран'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSwitch ? select : null}
          <button
            type="button"
            onClick={detectCity}
            disabled={locating || isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-5 text-sm font-bold text-ink-950 shadow-glow transition hover:bg-saffron-300 disabled:opacity-60"
          >
            {locating ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <LocateFixed size={17} strokeWidth={2.4} />
            )}
            {locating ? 'Определяем…' : 'Определить по геолокации'}
          </button>
        </div>
      </div>

      {showHint ? (
        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-cream-300/55">
          Разрешите доступ к геолокации — подберём блюда и рестораны рядом с вами.
          {canSwitch ? ' Или выберите город вручную.' : ''}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-saffron-300/85">{error}</p> : null}
    </div>
  )
}
