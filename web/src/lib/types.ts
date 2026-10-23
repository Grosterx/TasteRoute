export type Room = {
  room_id: string
  code: string
  city: string
  participants_count: number
}

export type Dish = {
  dish_id: string
  name: string
  description: string
  price: number
  tags: string[]
  image_url: string
  restaurant_id: string
  restaurant_name: string
  restaurant_address: string
  restaurant_cuisine: string
}

export type DishRef = {
  dish_id: string
  name: string
}

export type Stop = {
  restaurant_id: string
  name: string
  address: string
  lat: number
  lon: number
  dishes: DishRef[]
}

export type RouteData = {
  route_id: string
  stops: Stop[]
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
  likes: number
}

export type JoinResult = {
  participant_id: string
  token: string
  name: string
}
