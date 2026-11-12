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

  const select = (
    <select
      aria-label="Город"
      value={city}
      onChange={(event) => setCity(event.target.value)}
      disabled={isLoading || names.length === 0}
      className={cn(
        'rounded-xl border border-cream-200/12 bg-ink-900/80 px-3 py-1.5 text-xs font-medium text-cream-100 outline-none transition focus:border-saffron-400/70 disabled:opacity-50',
        compact ? 'max-w-[9.5rem]' : '',
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
          Город
        </span>
        {select}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-cream-300/60">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cream-200/10 bg-cream-50/[0.03] px-3 py-1.5">
          <MapPin size={13} className="text-saffron-400" />
          Ваш город:
          <strong className="font-semibold text-cream-50">{city || 'не выбран'}</strong>
        </span>
        {select}
        <button
          type="button"
          onClick={detectCity}
          disabled={locating || isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cream-200/12 bg-cream-50/[0.04] px-3 py-1.5 font-medium text-cream-100 transition hover:border-saffron-400/40 hover:bg-cream-50/[0.08] disabled:opacity-50"
        >
          {locating ? (
            <Loader2 size={13} className="animate-spin text-saffron-400" />
          ) : (
            <LocateFixed size={13} className="text-saffron-400" />
          )}
          {locating ? 'Определяем…' : 'Определить по геолокации'}
        </button>
      </div>
      {showHint ? (
        <p className="max-w-xl text-xs leading-relaxed text-cream-300/40">
          Разрешите доступ к геолокации — покажем блюда и рестораны в вашем городе. Или выберите
          город вручную.
        </p>
      ) : null}
      {error ? <p className="text-xs text-saffron-300/85">{error}</p> : null}
    </div>
  )
}
