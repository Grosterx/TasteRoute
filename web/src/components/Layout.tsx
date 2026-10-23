import { Link, NavLink, Outlet } from 'react-router-dom'
import { MapPinned, ShieldCheck } from 'lucide-react'
import { cn } from '../lib/utils'

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-xl px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-cream-50/[0.08] text-cream-50' : 'text-cream-300/65 hover:text-cream-50',
  )
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-cream-200/[0.07] bg-ink-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-saffron-400 text-ink-950 shadow-glow">
              <MapPinned size={19} strokeWidth={2.4} />
            </span>
            <span className="leading-none">
              <span className="block font-display text-xl font-bold tracking-tight text-cream-50">
                TasteRoute
              </span>
              <span className="mt-1 hidden text-[10px] uppercase tracking-[0.24em] text-cream-300/45 sm:block">
                вкусный маршрут
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Главная
            </NavLink>
            <NavLink to="/admin" className={navClass}>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={15} />
                <span className="hidden sm:inline">Заявки</span>
              </span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Outlet />
      </main>

      <footer className="border-t border-cream-200/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-cream-300/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>TasteRoute MVP · Тольятти · 20 ресторанов</span>
          <span>Свайпайте вместе. Идите туда, где совпали.</span>
        </div>
      </footer>
    </div>
  )
}
