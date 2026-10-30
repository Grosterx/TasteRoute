import type { Restaurant, RestaurantAccount } from './types'

export type RestaurantSession = {
  token: string
  account: RestaurantAccount
  restaurant: Restaurant
}

const key = 'tasteroute.restaurant-session'

export function getRestaurantSession(): RestaurantSession | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RestaurantSession
    if (!parsed.token || !parsed.account?.account_id || !parsed.restaurant?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function saveRestaurantSession(session: RestaurantSession) {
  localStorage.setItem(key, JSON.stringify(session))
}

export function updateRestaurantSession(restaurant: Restaurant) {
  const current = getRestaurantSession()
  if (!current) return
  saveRestaurantSession({ ...current, restaurant })
}

export function clearRestaurantSession() {
  localStorage.removeItem(key)
}
