import { useEffect, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { City } from './types'

const STORAGE_KEY = 'tasteroute.city'
const MAX_NEAREST_KM = 200

type UserCityState = {
  city: string
  cities: City[]
  manual: boolean
  locating: boolean
  error: string | null
}

function readStoredCity(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

let state: UserCityState = {
  city: readStoredCity(),
  cities: [],
  manual: Boolean(readStoredCity()),
  locating: false,
  error: null,
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function update(patch: Partial<UserCityState>) {
  state = { ...state, ...patch }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return state
}

function persistCity(city: string) {
  try {
    if (city) localStorage.setItem(STORAGE_KEY, city)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage can be unavailable in private mode — the in-memory city still works.
  }
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestCity(lat: number, lon: number, cities: City[]) {
  let best: { city: City; distance: number } | null = null
  for (const city of cities) {
    if (!city.lat && !city.lon) continue
    const distance = distanceKm(lat, lon, city.lat, city.lon)
    if (!best || distance < best.distance) best = { city, distance }
  }
  return best
}

function sameCityList(a: City[], b: City[]) {
  return (
    a.length === b.length &&
    a.every(
      (city, index) =>
        city.name === b[index]?.name && city.restaurants === b[index]?.restaurants,
    )
  )
}

function detectCity() {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    update({ error: 'Геолокация недоступна — выберите город вручную' })
    return
  }
  update({ locating: true, error: null })
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const nearest = nearestCity(
        position.coords.latitude,
        position.coords.longitude,
        state.cities,
      )
      if (nearest && nearest.distance <= MAX_NEAREST_KM) {
        persistCity(nearest.city.name)
        update({ city: nearest.city.name, manual: false, locating: false, error: null })
        return
      }
      update({
        locating: false,
        error: 'Рядом не нашли город с ресторанами — выберите вручную',
      })
    },
    (error) => {
      update({
        locating: false,
        error:
          error.code === error.PERMISSION_DENIED
            ? 'Доступ к геолокации выключен — выберите город вручную'
            : 'Не удалось определить город — выберите вручную',
      })
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60_000 },
  )
}

function selectCity(city: string) {
  const next = city.trim()
  persistCity(next)
  update({ city: next, manual: true, error: null })
}

export function useUserCity() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const citiesQuery = useQuery({
    queryKey: ['public-cities'],
    queryFn: () => api.publicCities(),
    staleTime: 5 * 60_000,
    retry: false,
  })

  useEffect(() => {
    const cities = citiesQuery.data
    if (!cities) return
    if (sameCityList(cities, snapshot.cities)) return

    const names = cities.map((city) => city.name)
    if (snapshot.city && names.includes(snapshot.city)) {
      update({ cities })
      return
    }
    update({ cities, city: names[0] ?? '', manual: false })
  }, [citiesQuery.data, snapshot.cities, snapshot.city])

  return {
    city: snapshot.city,
    cities: snapshot.cities.length ? snapshot.cities : (citiesQuery.data ?? []),
    setCity: selectCity,
    detectCity,
    locating: snapshot.locating,
    error: snapshot.error,
    isLoading: citiesQuery.isLoading,
  }
}
