import { Suspense, lazy } from 'react'
import type { MapPoint, RouteMapProps } from './routeMap/types'

export type { MapPoint }

const useYandex = Boolean((import.meta.env.VITE_YANDEX_MAPS_API_KEY ?? '').trim())

const MapView = lazy(() =>
  useYandex
    ? import('./routeMap/YandexView').then((module) => ({ default: module.default }))
    : import('./routeMap/MapLibreView').then((module) => ({ default: module.default })),
)

export function RouteMap(props: RouteMapProps) {
  return (
    <Suspense
      fallback={
        <div className="tasteroute-map h-[320px] w-full animate-pulse rounded-2xl border border-cream-200/10 bg-ink-900 sm:h-[380px]" />
      }
    >
      <MapView {...props} />
    </Suspense>
  )
}
