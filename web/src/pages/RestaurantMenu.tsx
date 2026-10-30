import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { api } from '../lib/api'
import { getRestaurantSession } from '../lib/restaurantSession'
import type { MenuDish } from '../lib/types'
import { formatPrice } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'

type MenuForm = {
  name: string
  description: string
  price: string
  tags: string
  image_url: string
  category: string
  sort_order: string
  active: boolean
}

const emptyForm: MenuForm = {
  name: '',
  description: '',
  price: '',
  tags: '',
  image_url: '',
  category: '',
  sort_order: '0',
  active: true,
}

export function RestaurantMenu() {
  const session = getRestaurantSession()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<MenuDish | null>(null)
  const [form, setForm] = useState<MenuForm>(emptyForm)
  const [message, setMessage] = useState<string | null>(null)

  const dishesQuery = useQuery({
    queryKey: ['restaurant-dishes', session?.token, 'all'],
    queryFn: () => api.restaurantDishes(session!.token, true),
    enabled: Boolean(session?.token),
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: {
      name: string
      description: string
      price: number
      tags: string[]
      image_url: string
      category: string
      sort_order: number
      active: boolean
    }) =>
      editing
        ? api.updateRestaurantDish(session!.token, editing.dish_id, payload)
        : api.createRestaurantDish(session!.token, payload),
    onSuccess: () => {
      setMessage(editing ? 'Блюдо сохранено' : 'Блюдо добавлено')
      setEditing(null)
      setForm(emptyForm)
      queryClient.invalidateQueries({ queryKey: ['restaurant-dishes'] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (dishID: string) => api.archiveRestaurantDish(session!.token, dishID),
    onSuccess: () => {
      setMessage('Блюдо убрано из активного меню')
      queryClient.invalidateQueries({ queryKey: ['restaurant-dishes'] })
    },
  })

  if (!session) return <Navigate to="/restaurant/login" replace />

  const dishes = dishesQuery.data ?? []

  const startEdit = (dish: MenuDish) => {
    setEditing(dish)
    setForm({
      name: dish.name,
      description: dish.description,
      price: String(dish.price),
      tags: dish.tags.join(', '),
      image_url: dish.image_url,
      category: dish.category,
      sort_order: String(dish.sort_order),
      active: dish.active,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => {
    setEditing(null)
    setForm(emptyForm)
    setMessage(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    const price = Number(form.price)
    if (!form.name.trim() || Number.isNaN(price) || price < 0) {
      setMessage('Укажите название и корректную цену')
      return
    }
    saveMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim(),
      price: Math.round(price),
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      image_url: form.image_url.trim(),
      category: form.category.trim(),
      sort_order: Number(form.sort_order) || 0,
      active: form.active,
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Меню</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-cream-50">Блюда для свайпов</h1>
          <p className="mt-2 text-sm text-cream-300/60">
            Гости видят только активные блюда. Скрытые остаются в истории и бронях.
          </p>
        </div>
        {editing ? (
          <Button variant="secondary" size="sm" onClick={reset}>
            Отменить редактирование
          </Button>
        ) : null}
      </div>

      <div className="surface p-5 sm:p-6">
        <div className="flex items-center gap-2 text-saffron-300">
          {editing ? <Pencil size={17} /> : <Plus size={17} />}
          <h2 className="break-words font-display text-xl font-bold">
            {editing ? `Редактировать: ${editing.name}` : 'Новое блюдо'}
          </h2>
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dish-name" className="field-label">
              Название
            </label>
            <Input
              id="dish-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="dish-category" className="field-label">
              Категория
            </label>
            <Input
              id="dish-category"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              placeholder="Паста, салаты, десерты"
            />
          </div>
          <div>
            <label htmlFor="dish-price" className="field-label">
              Цена, ₽
            </label>
            <Input
              id="dish-price"
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="dish-sort" className="field-label">
              Порядок
            </label>
            <Input
              id="dish-sort"
              type="number"
              step="1"
              value={form.sort_order}
              onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="dish-description" className="field-label">
              Описание
            </label>
            <Textarea
              id="dish-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={500}
            />
          </div>
          <div>
            <label htmlFor="dish-tags" className="field-label">
              Теги через запятую
            </label>
            <Input
              id="dish-tags"
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
              placeholder="хит, острое, веган"
            />
          </div>
          <div>
            <label htmlFor="dish-image" className="field-label">
              URL фото
            </label>
            <Input
              id="dish-image"
              value={form.image_url}
              onChange={(event) => setForm({ ...form, image_url: event.target.value })}
              placeholder="https://…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-cream-200/75 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
              className="h-4 w-4 rounded border-cream-200/20 bg-ink-900 accent-saffron-400"
            />
            Показывать блюдо гостям
          </label>

          {saveMutation.error ? (
            <p className="rounded-2xl border border-tomato-400/20 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-400 sm:col-span-2">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Не удалось сохранить блюдо'}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-2xl border border-basil-400/20 bg-basil-400/10 px-4 py-3 text-sm text-basil-400 sm:col-span-2">
              {message}
            </p>
          ) : null}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {editing ? 'Сохранить' : 'Добавить блюдо'}
            </Button>
            {editing ? (
              <Button type="button" variant="secondary" onClick={reset}>
                Отмена
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      {dishesQuery.isLoading ? (
        <div className="flex min-h-[25vh] items-center justify-center gap-3 text-sm text-cream-300/60">
          <Loader2 size={18} className="animate-spin text-saffron-400" />
          Загружаем меню…
        </div>
      ) : dishes.length === 0 ? (
        <div className="surface p-8 text-center">
          <UtensilsCrossed className="mx-auto text-cream-300/30" size={34} />
          <h2 className="mt-3 font-display text-2xl font-bold text-cream-50">Меню пока пустое</h2>
          <p className="mt-2 text-sm text-cream-300/55">Добавьте первое блюдо, чтобы запустить свайпы.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {dishes.map((dish) => (
            <div
              key={dish.dish_id}
              className="surface flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words font-display text-xl font-bold text-cream-50">
                    {dish.name}
                  </h2>
                  {!dish.active ? (
                    <span className="rounded-full bg-cream-50/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-cream-300/50">
                      скрыто
                    </span>
                  ) : null}
                  {dish.category ? (
                    <span className="text-[11px] text-cream-300/45">{dish.category}</span>
                  ) : null}
                </div>
                {dish.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-cream-300/55">{dish.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-cream-300/45">
                  <span className="font-semibold text-saffron-300">{formatPrice(dish.price)}</span>
                  {dish.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                  <span>порядок {dish.sort_order}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="sm" onClick={() => startEdit(dish)}>
                  <Pencil size={14} />
                  Изменить
                </Button>
                {dish.active ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate(dish.dish_id)}
                  >
                    <Trash2 size={14} />
                    Скрыть
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
