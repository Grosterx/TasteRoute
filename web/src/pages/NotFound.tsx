import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export function NotFound() {
  return (
    <div className="surface mx-auto max-w-lg p-9 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
        <Compass size={28} />
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold text-cream-50">Страница потерялась</h1>
      <p className="mt-2 text-sm text-cream-300/60">
        Такой маршрут ещё не проложили. Вернитесь к началу и соберите новый.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-saffron-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
      >
        На главную
      </Link>
    </div>
  )
}
