import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { MapPinned, Menu, Store, UtensilsCrossed, Wand2, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { CityPicker } from './CityPicker'

const navItems = [
  { to: '/', label: 'Главная', icon: MapPinned, end: true },
  { to: '/places', label: 'Рестораны', icon: UtensilsCrossed },
  { to: '/fun', label: 'Фишки', icon: Wand2 },
  { to: '/restaurant', label: 'Кабинет', icon: Store },
]

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-xl px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-cream-50/[0.08] text-cream-50' : 'text-cream-300/65 hover:text-cream-50',
  )
}

function drawerClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
    isActive
      ? 'bg-cream-50/[0.08] text-cream-50'
      : 'text-cream-300/65 hover:bg-cream-50/[0.04] hover:text-cream-50',
  )
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

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

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                <span className="flex items-center gap-1.5">
                  <Icon size={15} />
                  <span>{label}</span>
                </span>
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-cream-200/10 text-cream-100 transition hover:bg-cream-50/[0.06] lg:hidden"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
          />
          <aside
            id="mobile-nav"
            className="absolute right-0 top-0 flex h-full w-[min(20rem,calc(100vw-3rem))] flex-col overflow-y-auto border-l border-cream-200/10 bg-ink-950 p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold text-cream-50">Меню</span>
              <button
                type="button"
                aria-label="Закрыть меню"
                onClick={() => setMenuOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-cream-200/10 text-cream-100 transition hover:bg-cream-50/[0.06]"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-2">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuOpen(false)}
                  className={drawerClass}
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto space-y-4 pt-8">
              <CityPicker compact />
              <p className="text-xs leading-relaxed text-cream-300/40">
                Свайпайте вместе. Идите туда, где совпали.
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Outlet />
      </main>

      <footer className="border-t border-cream-200/[0.06]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md">
              <Link to="/" className="font-display text-lg font-bold text-cream-50">
                TasteRoute
              </Link>
              <p className="mt-3 text-xs leading-relaxed text-cream-300/45">
                А рестораны получают новых гостей, групповые брони и аналитику спроса — без
                вложений в разработку и своего приложения.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-cream-300/55">
              <Link to="/for-restaurants" className="transition hover:text-cream-50">
                Ресторанам
              </Link>
              <Link to="/restaurant" className="transition hover:text-cream-50">
                Кабинет
              </Link>
              <Link to="/admin" className="transition hover:text-cream-50">
                Админ
              </Link>
            </nav>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-cream-200/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <CityPicker compact />
            <span className="text-xs text-cream-300/35">
              Свайпайте вместе. Идите туда, где совпали.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
