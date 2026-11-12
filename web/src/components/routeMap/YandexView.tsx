import { useEffect, useRef, useState } from 'react'
import type { YMap, YMapFeature, YMapMarker } from '@yandex/ymaps3-types'
import { MapPinOff, Minus, Plus } from 'lucide-react'
import { cn } from '../../lib/utils'
import { buildPopupHtml } from './popup'
import { fallbackCenter, type RouteMapProps } from './types'

const apiKey = (import.meta.env.VITE_YANDEX_MAPS_API_KEY ?? '').trim()

let loaderPromise: Promise<void> | null = null

function loadYandexMaps(key: string): Promise<void> {
  if (loaderPromise) return loaderPromise
  loaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/3.0/?apikey=${encodeURIComponent(key)}&lang=ru_RU`
    script.async = true
    script.dataset.tasterouteYmaps = 'true'
    script.onload = () => {
      if (typeof ymaps3 === 'undefined') {
        reject(new Error('ymaps3 не загрузился'))
        return
      }
      ymaps3.ready.then(() => resolve()).catch(reject)
    }
    script.onerror = () => reject(new Error('Не удалось загрузить Яндекс.Карты'))
    document.head.appendChild(script)
  })
  return loaderPromise
}

export default function YandexView({
  points,
  connect = false,
  numbered = true,
  className,
  emptyLabel = 'Пока нет точек на карте',
  onSelect,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<YMap | null>(null)
  const markersRef = useRef<YMapMarker[]>([])
  const featuresRef = useRef<YMapFeature[]>([])
  const openBubbleRef = useRef<HTMLElement | null>(null)
  const lastMarkerClickRef = useRef(0)
  const pointsRef = useRef(points)
  pointsRef.current = points
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(!apiKey)

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current || !apiKey) return

    let disposed = false

    loadYandexMaps(apiKey)
      .then(() => {
        if (disposed) return

        const map = new ymaps3.YMap(container, {
          location: { center: fallbackCenter, zoom: 13 },
          theme: 'dark',
          behaviors: ['drag', 'pinchZoom', 'dblClick', 'oneFingerZoom'],
        })
        map.addChild(new ymaps3.YMapDefaultSchemeLayer({}))
        map.addChild(new ymaps3.YMapDefaultFeaturesLayer({}))

        map.addChild(
          new ymaps3.YMapListener({
            onClick: () => {
              if (Date.now() - lastMarkerClickRef.current < 300) return
              openBubbleRef.current?.classList.remove('is-open')
              openBubbleRef.current = null
            },
          }),
        )

        mapRef.current = map
        setReady(true)
      })
      .catch(() => {
        if (!disposed) setFailed(true)
      })

    return () => {
      disposed = true
      markersRef.current = []
      featuresRef.current = []
      openBubbleRef.current = null
      mapRef.current?.destroy()
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

    markersRef.current.forEach((marker) => map.removeChild(marker))
    markersRef.current = []
    featuresRef.current.forEach((feature) => map.removeChild(feature))
    featuresRef.current = []
    openBubbleRef.current = null

    const items = pointsRef.current.filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lon) &&
        (point.lat !== 0 || point.lon !== 0),
    )

    const coords: [number, number][] = []

    items.forEach((point, index) => {
      const element = document.createElement('div')
      element.className = 'tr-map-marker tr-map-marker--yandex'

      const dot = document.createElement('span')
      dot.className = numbered
        ? 'tr-map-marker__dot tr-map-marker__dot--numbered'
        : 'tr-map-marker__dot'
      if (numbered) dot.textContent = String(index + 1)

      const bubble = document.createElement('div')
      bubble.className = 'tr-map-bubble'
      bubble.innerHTML = buildPopupHtml(point)

      element.append(dot, bubble)

      element.addEventListener('click', (event) => {
        event.stopPropagation()
        lastMarkerClickRef.current = Date.now()
        const wasOpen = element.classList.contains('is-open')
        openBubbleRef.current?.classList.remove('is-open')
        openBubbleRef.current = null
        if (!wasOpen) {
          element.classList.add('is-open')
          openBubbleRef.current = element
        }
        onSelectRef.current?.(point.id)
      })

      const marker = new ymaps3.YMapMarker(
        {
          coordinates: [point.lon, point.lat],
          hideOutsideViewport: true,
        },
        element,
      )

      map.addChild(marker)
      markersRef.current.push(marker)
      coords.push([point.lon, point.lat])
    })

    if (connect && coords.length > 1) {
      const feature = new ymaps3.YMapFeature({
        geometry: { type: 'LineString', coordinates: coords },
        style: {
          stroke: [{ color: '#f7b84b', width: 3, opacity: 0.85, dash: [2, 2] }],
        },
      })
      map.addChild(feature)
      featuresRef.current.push(feature)
    }

    if (coords.length === 1) {
      map.update({ location: { center: coords[0], zoom: 15 } })
    } else if (coords.length > 1) {
      const lons = coords.map((coord) => coord[0])
      const lats = coords.map((coord) => coord[1])
      map.update({
        location: {
          bounds: [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          duration: 400,
        },
      })
    }
  }, [pointsKey, connect, numbered, ready])

  const zoomBy = (delta: number) => {
    const map = mapRef.current
    if (!map) return
    const next = Math.min(19, Math.max(3, map.zoom + delta))
    map.update({ location: { zoom: next, duration: 200 } })
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <div
          ref={containerRef}
          className="tasteroute-map tasteroute-map--yandex h-[320px] w-full overflow-hidden rounded-2xl border border-cream-200/10 bg-ink-900 sm:h-[380px]"
        />
        <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border border-cream-200/12 bg-ink-950/90 shadow-lg backdrop-blur">
          <button
            type="button"
            aria-label="Приблизить"
            onClick={() => zoomBy(1)}
            className="grid h-9 w-9 place-items-center text-cream-100 transition hover:bg-cream-50/10"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Отдалить"
            onClick={() => zoomBy(-1)}
            className="grid h-9 w-9 place-items-center border-t border-cream-200/10 text-cream-100 transition hover:bg-cream-50/10"
          >
            <Minus size={16} />
          </button>
        </div>
      </div>
      {failed ? (
        <div className="rounded-2xl border border-saffron-400/20 bg-saffron-400/[0.06] p-4 text-xs text-saffron-300/85">
          <p className="flex items-center gap-2 font-semibold">
            <MapPinOff size={14} />
            {apiKey
              ? 'Карта не загрузилась — вот точки списком'
              : 'Яндекс.Карты не настроены — вот точки списком'}
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
