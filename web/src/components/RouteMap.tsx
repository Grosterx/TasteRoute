import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPinOff } from 'lucide-react'
import { cn } from '../lib/utils'

export type MapPoint = {
  id: string
  name: string
  address?: string
  lat: number
  lon: number
  dishes?: string[]
  href?: string
}

type RouteMapProps = {
  points: MapPoint[]
  connect?: boolean
  numbered?: boolean
  className?: string
  emptyLabel?: string
  onSelect?: (id: string) => void
}

const fallbackCenter: L.LatLngExpression = [53.5078, 49.4204]

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char)
}

export function RouteMap({
  points,
  connect = false,
  numbered = true,
  className,
  emptyLabel = 'Пока нет точек на карте',
  onSelect,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const pointsRef = useRef(points)
  pointsRef.current = points
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [tilesFailed, setTilesFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    })
    map.setView(fallbackCenter, 13)

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    })
    tiles.on('tileerror', () => setTilesFailed(true))
    tiles.addTo(map)

    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  const pointsKey = points
    .map((point) => `${point.id}:${point.lat}:${point.lon}:${point.name}`)
    .join('|')

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    const items = pointsRef.current.filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lon) &&
        (point.lat !== 0 || point.lon !== 0),
    )
    if (items.length === 0) return

    const coords: L.LatLngExpression[] = []

    items.forEach((point, index) => {
      const label = numbered ? String(index + 1) : ''
      const size = numbered ? 32 : 18
      const icon = L.divIcon({
        className: 'tr-map-marker',
        html: `<span class="tr-map-marker__dot${numbered ? ' tr-map-marker__dot--numbered' : ''}">${label}</span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      })

      const marker = L.marker([point.lat, point.lon], { icon, title: point.name }).addTo(layer)
      if (onSelectRef.current) {
        marker.on('click', () => onSelectRef.current?.(point.id))
      }
      const dishes = point.dishes?.length
        ? `<ul class="tr-map-popup__dishes">${point.dishes
            .map((dish) => `<li>${escapeHtml(dish)}</li>`)
            .join('')}</ul>`
        : ''
      const link = point.href
        ? `<a class="tr-map-popup__link" href="${escapeHtml(point.href)}">Открыть меню</a>`
        : ''

      marker.bindPopup(
        `<div class="tr-map-popup"><p class="tr-map-popup__name">${escapeHtml(point.name)}</p>${
          point.address
            ? `<p class="tr-map-popup__address">${escapeHtml(point.address)}</p>`
            : ''
        }${dishes}${link}</div>`,
      )
      coords.push([point.lat, point.lon])
    })

    if (connect && coords.length > 1) {
      L.polyline(coords, {
        color: '#f7b84b',
        weight: 3,
        opacity: 0.85,
        dashArray: '7 9',
      }).addTo(layer)
    }

    if (coords.length === 1) {
      map.setView(coords[0], 15)
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [42, 42], maxZoom: 15 })
    }
  }, [pointsKey, connect, numbered])

  return (
    <div className={cn('space-y-3', className)}>
      <div
        ref={containerRef}
        className="tasteroute-map h-[320px] w-full overflow-hidden rounded-2xl border border-cream-200/10 bg-ink-900 sm:h-[380px]"
      />
      {tilesFailed ? (
        <div className="rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.06] p-4 text-xs text-saffron-300/85">
          <p className="flex items-center gap-2 font-semibold">
            <MapPinOff size={14} />
            Карта не загрузилась — вот точки списком
          </p>
          <ul className="mt-2 space-y-1 text-cream-200/70">
            {points.map((point) => (
              <li key={point.id}>
                {point.name}
                {point.address ? ` — ${point.address}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {points.length === 0 ? (
        <p className="text-center text-xs text-cream-300/45">{emptyLabel}</p>
      ) : null}
    </div>
  )
}
