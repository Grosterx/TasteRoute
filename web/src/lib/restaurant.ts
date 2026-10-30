export const bookingStatusOptions = [
  { value: 'new', label: 'Новая' },
  { value: 'contacted', label: 'В работе' },
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'declined', label: 'Отклонена' },
  { value: 'completed', label: 'Завершена' },
]

export const salesStatusOptions = [
  { value: 'new', label: 'Новая' },
  { value: 'contacted', label: 'Связались' },
  { value: 'demo', label: 'Демо' },
  { value: 'won', label: 'Подключён' },
  { value: 'lost', label: 'Отказ' },
]

export function bookingStatusLabel(status: string) {
  return bookingStatusOptions.find((item) => item.value === status)?.label ?? status
}

export function salesStatusLabel(status: string) {
  return salesStatusOptions.find((item) => item.value === status)?.label ?? status
}

export function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    qr: 'QR',
    direct: 'Прямая ссылка',
    place: 'Страница ресторана',
    city: 'Город',
  }
  return labels[source] ?? source
}

export function dateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
