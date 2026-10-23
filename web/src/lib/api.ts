import type { Dish, JoinResult, Lead, Room, RouteData } from './types'

const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined
export const API_BASE = (configuredBase?.trim() || '/tasteroute/api').replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string
  adminToken?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
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
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Ошибка запроса (${response.status})`
    throw new ApiError(response.status, message)
  }
  return payload as T
}

export const api = {
  createRoom(city: string) {
    return request<Room>('/rooms', { method: 'POST', body: { city } })
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
  createLead(token: string, payload: { name: string; phone: string; comment: string }) {
    return request<{ ok: boolean }>('/leads', { method: 'POST', body: payload, token })
  },
  adminLeads(adminToken: string) {
    return request<Lead[]>('/admin/leads', { adminToken })
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
  return `${window.location.origin}/r/${code}`
}
