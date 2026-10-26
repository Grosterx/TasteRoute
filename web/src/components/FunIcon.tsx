import type { LucideIcon } from 'lucide-react'
import {
  CakeSlice,
  Candy,
  Cookie,
  Croissant,
  Donut,
  Flame,
  Heart,
  Leaf,
  Moon,
  Sandwich,
  Sparkles,
  Users,
  Wheat,
} from 'lucide-react'
import type { FunIcon as FunIconName } from '../lib/fun'

const icons: Record<FunIconName, LucideIcon> = {
  sandwich: Sandwich,
  flame: Flame,
  heart: Heart,
  leaf: Leaf,
  sparkles: Sparkles,
  users: Users,
  moon: Moon,
  croissant: Croissant,
  cookie: Cookie,
  cake: CakeSlice,
  wheat: Wheat,
  donut: Donut,
  candy: Candy,
}

type FunIconGlyphProps = {
  name: FunIconName
  size?: number
  className?: string
  strokeWidth?: number
}

export function FunIconGlyph({ name, size = 22, className, strokeWidth }: FunIconGlyphProps) {
  const Icon = icons[name]
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />
}
