export type Session = {
  participantId: string
  token: string
  name: string
  roomCode: string
}

const key = 'tasteroute.session'

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed.token || !parsed.roomCode || !parsed.participantId) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(key, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(key)
}
