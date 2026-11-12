import type { Dish, Match } from './types'

const MIN_ROUTE_RESTAURANTS = 2

type Baseline = {
  likes?: number
  restaurants?: number
}

export function useRouteProgress(matches: Match[], catalog: Dish[], baseline?: Baseline) {
  const byID = new Map(catalog.map((dish) => [dish.dish_id, dish]))
  const restaurants = new Map<string, string>()

  for (const match of matches) {
    const dish = byID.get(match.dish_id)
    if (dish) restaurants.set(dish.restaurant_id, dish.restaurant_name)
  }

  const likedCount = Math.max(matches.length, baseline?.likes ?? 0)
  const restaurantCount = Math.max(restaurants.size, baseline?.restaurants ?? 0)

  return {
    likedCount,
    restaurantCount,
    restaurantNames: Array.from(restaurants.values()),
    ready: restaurantCount >= MIN_ROUTE_RESTAURANTS,
    minRestaurants: MIN_ROUTE_RESTAURANTS,
  }
}
