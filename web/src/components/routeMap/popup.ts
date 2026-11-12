import type { MapPoint } from './types'

export function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char)
}

export function buildPopupHtml(point: MapPoint) {
  const dishes = point.dishes?.length
    ? `<ul class="tr-map-popup__dishes">${point.dishes
        .map((dish) => `<li>${escapeHtml(dish)}</li>`)
        .join('')}</ul>`
    : ''
  const link = point.href
    ? `<a class="tr-map-popup__link" href="${escapeHtml(point.href)}">Открыть меню</a>`
    : ''
  const address = point.address
    ? `<p class="tr-map-popup__address">${escapeHtml(point.address)}</p>`
    : ''

  return `<div class="tr-map-popup"><p class="tr-map-popup__name">${escapeHtml(point.name)}</p>${address}${dishes}${link}</div>`
}
