import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPinOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import { buildPopupHtml } from './popup'
import { fallbackCenter, type RouteMapProps } from './types'

const emptyRoute: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

export default function MapLibreView({
  points,
  connect = false,
  numbered = true,
  className,
  emptyLabel = 'Пока нет точек на карте',
  onSelect,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const pointsRef = useRef(points)
  pointsRef.current = points
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [ready, setReady] = useState(false)
  const [tilesFailed, setTilesFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              maxzoom: 19,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center: fallbackCenter,
        zoom: 13,
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        attributionControl: { compact: true },
      })
    } catch {
      setTilesFailed(true)
      return
    }

    map.touchZoomRotate.disableRotation()

    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: emptyRoute })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f7b84b',
          'line-width': 3,
          'line-opacity': 0.85,
          'line-dasharray': [2, 2],
        },
      })
      setReady(true)
    })

    map.on('error', (event: maplibregl.ErrorEvent) => {
      const sourceId = (event as unknown as { sourceId?: string }).sourceId
      const message = event.error?.message ?? ''
      if (sourceId === 'osm' || /tile/i.test(message)) setTilesFailed(true)
    })

    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container)

    mapRef.current = map

    return () => {
      observer.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  const pointsKey = points
    .map((point) => `${point.id}:${point.lat}:${point.lon}:${point.name}`)
    .join('|')

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const items = pointsRef.current.filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lon) &&
        (point.lat !== 0 || point.lon !== 0),
    )

    const coords: [number, number][] = []

    items.forEach((point, index) => {
      const element = document.createElement('div')
      element.className = 'tr-map-marker'

      const dot = document.createElement('span')
      dot.className = numbered
        ? 'tr-map-marker__dot tr-map-marker__dot--numbered'
        : 'tr-map-marker__dot'
      if (numbered) dot.textContent = String(index + 1)
      element.appendChild(dot)

      if (onSelectRef.current) {
        element.addEventListener('click', () => onSelectRef.current?.(point.id))
      }

      const popup = new maplibregl.Popup({
        offset: 18,
        closeButton: false,
        className: 'tr-map-popup-shell',
      }).setHTML(buildPopupHtml(point))

      const marker = new maplibregl.Marker({ element, anchor: 'center' })
        .setLngLat([point.lon, point.lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
      coords.push([point.lon, point.lat])
    })

    const routeSource = map.getSource('route') as maplibregl.GeoJSONSource | undefined
    if (routeSource) {
      routeSource.setData(
        connect && coords.length > 1
          ? {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: coords },
            }
          : emptyRoute,
      )
    }

    if (coords.length === 1) {
      map.jumpTo({ center: coords[0], zoom: 15 })
    } else if (coords.length > 1) {
      const bounds = coords.reduce(
        (acc, coord) => acc.extend(coord),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      )
      map.fitBounds(bounds, { padding: 42, maxZoom: 15, duration: 500 })
    }
  }, [pointsKey, connect, numbered, ready])

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
