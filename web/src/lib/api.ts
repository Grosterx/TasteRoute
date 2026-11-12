import { clearRestaurantSession } from './restaurantSession'
import type {
  AdminMetrics,
  AdminRestaurant,
  Booking,
  City,
  Dish,
  JoinResult,
  Lead,
  MenuDish,
  PublicRestaurant,
  Restaurant,
  RestaurantAccount,
  RestaurantAnalytics,
  RestaurantLoginResult,
  Room,
  RouteData,
  SalesLead,
  Selection,
} from './types'

const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined
export const API_BASE = (configuredBase?.trim() || '/tasteroute/api').replace(/\/$/, '')

let publicAppURL = ''

export async function loadPublicConfig() {
  try {
    const config = await request<{ public_app_url?: string }>('/public/config')
    publicAppURL = config?.public_app_url?.trim().replace(/\/$/, '') || ''
  } catch {
    return
  }
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string
  adminToken?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'serveo-skip-browser-warning': 'true',
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.adminToken) headers['X-Admin-Token'] = options.adminToken

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  let payload: unknown = undefined
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    if (response.status === 401 && options.token && path.startsWith('/restaurant/')) {
      clearRestaurantSession()
      if (window.location.pathname.startsWith('/restaurant/')) {
        window.location.replace('/restaurant/login?expired=1')
      }
    }
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Ошибка запроса (${response.status})`
    throw new ApiError(response.status, message)
  }
  return payload as T
}

type RoomInput = {
  city?: string
  restaurantSlug?: string
  source?: string
}

type BookingInput = {
  name: string
  phone: string
  party_size: number
  requested_at?: string
  comment: string
}

type SalesLeadInput = {
  restaurant_name: string
  contact_name: string
  phone: string
  email?: string
  city?: string
  message?: string
}

type DishInput = {
  name: string
  description: string
  price: number
  tags: string[]
  image_url: string
  category: string
  sort_order: number
  active?: boolean
  blind?: boolean
  blind_riddle?: string
}

export const api = {
  createRoom(input: string | RoomInput = {}) {
    const body = typeof input === 'string' ? { city: input } : input
    return request<Room>('/rooms', {
      method: 'POST',
      body: {
        city: body.city,
        restaurant_slug: body.restaurantSlug,
        source: body.source,
      },
    })
  },
  getRoom(code: string) {
    return request<Room>(`/rooms/${encodeURIComponent(code)}`)
  },
  joinRoom(code: string, name: string) {
    return request<JoinResult>(`/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: { name },
    })
  },
  catalog(code: string, token: string) {
    return request<Dish[]>(`/rooms/${encodeURIComponent(code)}/catalog`, { token })
  },
  route(code: string, token: string) {
    return request<RouteData>(`/rooms/${encodeURIComponent(code)}/route`, { token })
  },
  selection(code: string, token: string) {
    return request<Selection>(`/rooms/${encodeURIComponent(code)}/selection`, { token })
  },
  createBooking(token: string, payload: BookingInput) {
    return request<Booking>('/bookings', { method: 'POST', body: payload, token })
  },
  createLead(token: string, payload: { name: string; phone: string; comment: string }) {
    return request<{ ok: boolean }>('/leads', { method: 'POST', body: payload, token })
  },
  publicRestaurants(city?: string) {
    const query = city ? `?city=${encodeURIComponent(city)}` : ''
    return request<Restaurant[]>(`/public/restaurants${query}`)
  },
  publicCities() {
    return request<City[]>('/public/cities')
  },
  publicRestaurant(slug: string) {
    return request<PublicRestaurant>(`/public/restaurants/${encodeURIComponent(slug)}`)
  },
  trackRestaurantView(slug: string, source: string) {
    return request<{ ok: boolean }>(`/public/restaurants/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      body: { source },
    })
  },
  createSalesLead(payload: SalesLeadInput) {
    return request<{ ok: boolean; id: string }>('/sales-leads', { method: 'POST', body: payload })
  },
  adminLeads(adminToken: string) {
    return request<Lead[]>('/admin/leads', { adminToken })
  },
  adminRestaurants(adminToken: string) {
    return request<AdminRestaurant[]>('/admin/restaurants', { adminToken })
  },
  adminCreateRestaurant(adminToken: string, payload: Partial<Restaurant>) {
    return request<Restaurant>('/admin/restaurants', {
      method: 'POST',
      body: payload,
      adminToken,
    })
  },
  adminUpdateRestaurant(adminToken: string, restaurantID: string, payload: Partial<Restaurant>) {
    return request<Restaurant>(`/admin/restaurants/${encodeURIComponent(restaurantID)}`, {
      method: 'PATCH',
      body: payload,
      adminToken,
    })
  },
  adminSetRestaurantAccount(
    adminToken: string,
    restaurantID: string,
    payload: { email: string; password: string },
  ) {
    return request<RestaurantAccount>(
      `/admin/restaurants/${encodeURIComponent(restaurantID)}/account`,
      { method: 'POST', body: payload, adminToken },
    )
  },
  adminSalesLeads(adminToken: string) {
    return request<SalesLead[]>('/admin/sales-leads', { adminToken })
  },
  adminUpdateSalesLead(adminToken: string, leadID: string, status: string) {
    return request<SalesLead>(`/admin/sales-leads/${encodeURIComponent(leadID)}`, {
      method: 'PATCH',
      body: { status },
      adminToken,
    })
  },
  adminBookings(adminToken: string, restaurantID?: string) {
    const query = restaurantID ? `?restaurant_id=${encodeURIComponent(restaurantID)}` : ''
    return request<Booking[]>(`/admin/bookings${query}`, { adminToken })
  },
  adminMetrics(adminToken: string) {
    return request<AdminMetrics>('/admin/metrics', { adminToken })
  },
  restaurantLogin(email: string, password: string) {
    return request<RestaurantLoginResult>('/restaurant/login', {
      method: 'POST',
      body: { email, password },
    })
  },
  restaurantMe(token: string) {
    return request<{ account: RestaurantAccount; restaurant: Restaurant }>('/restaurant/me', { token })
  },
  updateRestaurantProfile(token: string, payload: Partial<Restaurant>) {
    return request<Restaurant>('/restaurant/me', { method: 'PATCH', body: payload, token })
  },
  changeRestaurantPassword(token: string, currentPassword: string, newPassword: string) {
    return request<{ ok: boolean }>('/restaurant/change-password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
      token,
    })
  },
  restaurantDishes(token: string, all = false) {
    return request<MenuDish[]>(`/restaurant/dishes${all ? '?all=1' : ''}`, { token })
  },
  createRestaurantDish(token: string, payload: DishInput) {
    return request<MenuDish>('/restaurant/dishes', { method: 'POST', body: payload, token })
  },
  updateRestaurantDish(token: string, dishID: string, payload: DishInput) {
    return request<MenuDish>(`/restaurant/dishes/${encodeURIComponent(dishID)}`, {
      method: 'PATCH',
      body: payload,
      token,
    })
  },
  archiveRestaurantDish(token: string, dishID: string) {
    return request<{ ok: boolean }>(`/restaurant/dishes/${encodeURIComponent(dishID)}`, {
      method: 'DELETE',
      token,
    })
  },
  restaurantBookings(token: string, status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return request<Booking[]>(`/restaurant/bookings${query}`, { token })
  },
  updateRestaurantBooking(token: string, bookingID: string, status: string) {
    return request<Booking>(`/restaurant/bookings/${encodeURIComponent(bookingID)}`, {
      method: 'PATCH',
      body: { status },
      token,
    })
  },
  restaurantAnalytics(token: string, from?: string, to?: string) {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const query = params.toString()
    return request<RestaurantAnalytics>(`/restaurant/analytics${query ? `?${query}` : ''}`, { token })
  },
}

export function wsURL(code: string, token: string) {
  const url = new URL(API_BASE, window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`
  url.search = new URLSearchParams({ room: code, token }).toString()
  return url.toString()
}

export function shareURL(code: string) {
  return `${publicAppURL || window.location.origin}/r/${code}`
}

export function placeURL(slug: string, source = 'direct') {
  return `${publicAppURL || window.location.origin}/places/${encodeURIComponent(slug)}?src=${encodeURIComponent(source)}`
}
