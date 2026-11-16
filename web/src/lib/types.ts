export type Room = {
  room_id: string
  code: string
  city: string
  participants_count: number
  matches_count?: number
  matched_restaurants?: number
  mode: 'city' | 'restaurant' | string
  source: string
  restaurant_id?: string
  restaurant_name?: string
  restaurant_slug?: string
}

export type Dish = {
  dish_id: string
  name: string
  description: string
  price: number
  tags: string[]
  image_url: string
  blind?: boolean
  restaurant_id: string
  restaurant_name: string
  restaurant_address: string
  restaurant_cuisine: string
}

export type DishRef = {
  dish_id: string
  name: string
  price?: number
  blind?: boolean
}

export type Stop = {
  restaurant_id: string
  name: string
  address: string
  lat: number
  lon: number
  dishes: DishRef[]
}

export type RouteLeg = {
  from_restaurant_id: string
  to_restaurant_id: string
  distance_km: number
  walk_min: number
  drive_min: number
  taxi_min: number
  transit_min: number
}

export type RouteTotals = {
  distance_km: number
  walk_min: number
  drive_min: number
  taxi_min: number
  transit_min: number
}

export type RouteData = {
  route_id: string
  stops: Stop[]
  legs: RouteLeg[]
  total: RouteTotals
}

export type Lead = {
  id: string
  room_code: string
  route_id?: string
  participant_id: string
  name: string
  phone: string
  comment: string
  status: string
  route: RouteData | null
  created_at: string
}

export type Match = {
  dish_id: string
  dish_name?: string
  blind?: boolean
  likes: number
}

export type JoinResult = {
  participant_id: string
  token: string
  name: string
}

export type City = {
  name: string
  lat: number
  lon: number
  restaurants: number
}

export type Restaurant = {
  id: string
  slug: string
  name: string
  description: string
  address: string
  city: string
  cuisine: string
  phone: string
  website: string
  hours: string
  lat: number
  lon: number
  image_url: string
  cover_url: string
  plan?: string
  plan_status?: string
  trial_ends_at?: string | null
  featured: boolean
  is_demo?: boolean
  active: boolean
  created_at?: string
}

export type MenuDish = {
  dish_id: string
  restaurant_id: string
  name: string
  description: string
  price: number
  tags: string[]
  image_url: string
  category: string
  sort_order: number
  active: boolean
  blind: boolean
  blind_riddle: string
}

export type PublicRestaurant = Restaurant & {
  dishes: MenuDish[]
}

export type RestaurantAccount = {
  account_id: string
  restaurant_id: string
  email: string
  role: string
  active: boolean
  created_at: string
  last_login_at?: string | null
}

export type RestaurantLoginResult = {
  token: string
  account: RestaurantAccount
  restaurant: Restaurant
}

export type SelectionDish = {
  dish_id: string
  name: string
  description: string
  price: number
  tags: string[]
  image_url: string
  likes: number
  blind?: boolean
}

export type Booking = {
  id: string
  restaurant_id: string
  room_code: string
  participant_id: string
  name: string
  phone: string
  party_size: number
  requested_at?: string | null
  comment: string
  status: string
  source: string
  chain_id?: string
  stop_order?: number
  route_id?: string
  restaurant_name?: string
  restaurant_address?: string
  restaurant_city?: string
  chain_size?: number
  dishes: DishRef[]
  created_at: string
  updated_at: string
}

export type ChainStop = {
  booking_id: string
  restaurant_id: string
  restaurant_name: string
  restaurant_address: string
  restaurant_city: string
  stop_order: number
  requested_at?: string | null
  status: string
  dishes: DishRef[]
  created_at: string
}

export type BookingChain = {
  id: string
  route_id?: string
  participant_id: string
  name: string
  phone: string
  party_size: number
  comment: string
  status: string
  stops: ChainStop[]
  created_at: string
  updated_at: string
}

export type Selection = {
  room: Room
  restaurant: Restaurant
  dishes: SelectionDish[]
  booking: Booking | null
}

export type SummaryRestaurant = {
  id: string
  slug: string
  name: string
  description: string
  address: string
  city: string
  cuisine: string
  phone: string
  hours: string
  image_url: string
  cover_url: string
  lat: number
  lon: number
  matches: number
  dishes: SelectionDish[]
}

export type RoomSummary = {
  room: Room
  restaurants: SummaryRestaurant[]
  booking: Booking | null
  chain: BookingChain | null
}

export type SalesLead = {
  id: string
  restaurant_name: string
  contact_name: string
  phone: string
  email: string
  city: string
  message: string
  status: string
  created_at: string
  updated_at: string
}

export type AdminRestaurant = Restaurant & {
  accounts: RestaurantAccount[]
}

export type AdminMetrics = {
  restaurants: number
  active_restaurants: number
  trials: number
  rooms: number
  bookings: number
  sales_leads: number
}

export type AnalyticsSummary = {
  from: string
  to: string
  views: number
  qr_views: number
  rooms: number
  guests: number
  matches: number
  bookings: number
  confirmed: number
  conversion: number
}

export type AnalyticsTopDish = {
  dish_id: string
  name: string
  likes: number
  matches: number
}

export type AnalyticsDay = {
  date: string
  views: number
  rooms: number
  bookings: number
}

export type AnalyticsSource = {
  source: string
  rooms: number
  views: number
}

export type RestaurantAnalytics = {
  summary: AnalyticsSummary
  top_dishes: AnalyticsTopDish[]
  daily: AnalyticsDay[]
  sources: AnalyticsSource[]
}
