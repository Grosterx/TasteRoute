import type { LucideIcon } from 'lucide-react'
import {
  CakeSlice,
  Candy,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  Donut,
  Drumstick,
  Beef,
  Fish,
  Flame,
  Heart,
  IceCreamCone,
  Leaf,
  Moon,
  Pizza,
  Salad,
  Sandwich,
  Sparkles,
  Soup,
  Users,
  Wheat,
  Wine,
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
  wine: Wine,
  fish: Fish,
  beef: Beef,
  pizza: Pizza,
  salad: Salad,
  soup: Soup,
  coffee: Coffee,
  icecream: IceCreamCone,
  drumstick: Drumstick,
  citrus: Citrus,
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
