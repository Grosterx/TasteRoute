export type MapPoint = {
  id: string
  name: string
  address?: string
  lat: number
  lon: number
  dishes?: string[]
  href?: string
}

export type RouteMapProps = {
  points: MapPoint[]
  connect?: boolean
  numbered?: boolean
  className?: string
  emptyLabel?: string
  onSelect?: (id: string) => void
}

export const fallbackCenter: [number, number] = [49.4204, 53.5078]
