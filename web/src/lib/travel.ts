import type { RouteLeg, RouteTotals } from './types'

export type TravelMode = 'walk' | 'taxi' | 'drive' | 'transit'

export const travelModes: { value: TravelMode; label: string; short: string }[] = [
  { value: 'walk', label: 'Пешком', short: 'пешком' },
  { value: 'taxi', label: 'На такси', short: 'на такси' },
  { value: 'drive', label: 'На машине', short: 'на машине' },
  { value: 'transit', label: 'Транспорт', short: 'транспортом' },
]

// How long the company plans to stay in one place. Used only to suggest the
// next stop time, the guest can edit every time.
export const dwellMinutes = 90

export function legMinutes(leg: RouteLeg, mode: TravelMode) {
  switch (mode) {
    case 'walk':
      return leg.walk_min
    case 'taxi':
      return leg.taxi_min
    case 'drive':
      return leg.drive_min
    default:
      return leg.transit_min
  }
}

export function totalMinutes(total: RouteTotals, mode: TravelMode) {
  switch (mode) {
    case 'walk':
      return total.walk_min
    case 'taxi':
      return total.taxi_min
    case 'drive':
      return total.drive_min
    default:
      return total.transit_min
  }
}

export function travelModeLabel(mode: TravelMode) {
  return travelModes.find((item) => item.value === mode)?.label ?? mode
}

export function travelModeShort(mode: TravelMode) {
  return travelModes.find((item) => item.value === mode)?.short ?? mode
}

// Walking for a compact route, taxi when the stops are far apart.
export function defaultTravelMode(legs: RouteLeg[]): TravelMode {
  if (legs.length === 0) return 'walk'
  return legs.every((leg) => leg.distance_km <= 2.5) ? 'walk' : 'taxi'
}

export function formatMinutes(minutes: number) {
  const value = Math.max(1, Math.round(minutes))
  return `≈ ${value} мин`
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} м`
  return `${km.toFixed(1).replace('.', ',')} км`
}

export function travelSummary(leg: RouteLeg) {
  return `${formatDistance(leg.distance_km)} · ${formatMinutes(leg.walk_min)} пешком · ${formatMinutes(leg.taxi_min)} на такси`
}

// suggestStopTimes builds increasing start times for route stops: the guest
// stays dwellMinutes in each place and then moves to the next one.
export function suggestStopTimes(legs: RouteLeg[], mode: TravelMode, start: Date) {
  const times = [new Date(start)]
  for (const leg of legs) {
    const previous = times[times.length - 1]
    times.push(new Date(previous.getTime() + (dwellMinutes + legMinutes(leg, mode)) * 60_000))
  }
  return times
}

export function nextHalfHour(date = new Date()) {
  const result = new Date(date)
  result.setSeconds(0, 0)
  result.setMinutes(result.getMinutes() + (30 - (result.getMinutes() % 30)))
  return result
}

export function localDatetimeValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function parseLocalDatetime(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
