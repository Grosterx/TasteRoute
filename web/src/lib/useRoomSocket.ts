import { useCallback, useEffect, useRef, useState } from 'react'
import { wsURL } from './api'
import type { Match } from './types'

type SocketMessage =
  | { type: 'participants'; count: number }
  | { type: 'match'; dish_id: string; likes: number }
  | { type: 'error'; message: string }

export function useRoomSocket(roomCode?: string, token?: string) {
  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState(0)
  const [matches, setMatches] = useState<Match[]>([])
  const [lastMatch, setLastMatch] = useState<Match | null>(null)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!roomCode || !token) return
    let closed = false
    let timer: number | undefined
    let attempts = 0

    const connect = () => {
      const ws = new WebSocket(wsURL(roomCode, token))
      socketRef.current = ws

      ws.onopen = () => {
        if (closed) return
        attempts = 0
        setConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as SocketMessage
          if (message.type === 'participants') {
            setParticipants(message.count)
          } else if (message.type === 'match') {
            const match = { dish_id: String(message.dish_id), likes: Number(message.likes) }
            setLastMatch(match)
            setMatches((previous) =>
              previous.some((item) => item.dish_id === match.dish_id)
                ? previous
                : [...previous, match],
            )
          } else if (message.type === 'error') {
            setError(message.message)
          }
        } catch {
          // Ignore malformed frames from an unknown server.
        }
      }

      ws.onclose = () => {
        if (closed) return
        setConnected(false)
        timer = window.setTimeout(connect, Math.min(1000 * 2 ** attempts, 8000))
        attempts += 1
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()
    return () => {
      closed = true
      if (timer) window.clearTimeout(timer)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [roomCode, token])

  const sendSwipe = useCallback((dishID: string, liked: boolean) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify({ type: 'swipe', dish_id: dishID, liked }))
    return true
  }, [])

  const clearLastMatch = useCallback(() => setLastMatch(null), [])

  return { connected, participants, matches, lastMatch, error, sendSwipe, clearLastMatch }
}
