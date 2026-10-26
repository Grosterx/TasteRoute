import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Croissant, Sparkles } from 'lucide-react'
import type { FunResult } from '../lib/fun'
import { findBunResult, zodiacSigns } from '../lib/fun'
import { FunResultCard } from '../components/FunResultCard'

export function BunHoroscope() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sharedResult = findBunResult(searchParams.get('result'))
  const [result, setResult] = useState<FunResult | null>(sharedResult)

  useEffect(() => {
    const next = findBunResult(searchParams.get('result'))
    setResult(next)
  }, [searchParams])

  const choose = (signId: string) => {
    const next = findBunResult(signId)
    if (!next) return
    setResult(next)
    setSearchParams({ result: next.id }, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const restart = () => {
    setResult(null)
    setSearchParams({}, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          to="/fun"
          className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
        >
          <ArrowLeft size={16} />
          К гастро-фишкам
        </Link>
        <FunResultCard
          result={result}
          featureLabel="Булка по гороскопу"
          onRestart={restart}
          restartLabel="Выбрать другой знак"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/fun"
        className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
      >
        <ArrowLeft size={16} />
        К гастро-фишкам
      </Link>

      <div className="surface mt-6 overflow-hidden">
        <div className="relative overflow-hidden border-b border-cream-200/10 bg-gradient-to-br from-basil-400/20 via-saffron-400/10 to-transparent p-7 sm:p-9">
          <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-basil-400/15 blur-3xl" />
          <div className="relative">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-basil-400 text-ink-950">
              <Croissant size={27} />
            </div>
            <p className="eyebrow mt-6">Еда и звёзды</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
              Какая ты булка
              <span className="block text-saffron-300">по гороскопу?</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-cream-300/65 sm:text-base">
              Выбери свой знак зодиака — и узнай, какой хлебный характер достался тебе сегодня. Без
              даты рождения и сложных расчётов.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-cream-200/60">
              <span className="rounded-full border border-cream-200/10 bg-cream-50/[0.04] px-3 py-1">
                12 знаков
              </span>
              <span className="rounded-full border border-cream-200/10 bg-cream-50/[0.04] px-3 py-1">
                1 минута
              </span>
              <span className="rounded-full border border-cream-200/10 bg-cream-50/[0.04] px-3 py-1">
                без регистрации
              </span>
            </div>
          </div>
        </div>

        <div className="p-7 sm:p-9">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {zodiacSigns.map((sign) => (
              <button
                key={sign.id}
                type="button"
                onClick={() => choose(sign.id)}
                className="group rounded-2xl border border-cream-200/10 bg-cream-50/[0.025] p-4 text-left transition hover:border-saffron-400/40 hover:bg-saffron-400/[0.06]"
              >
                <span className="block text-sm font-semibold text-cream-50">{sign.name}</span>
                <span className="mt-1 block text-[11px] text-cream-300/45">{sign.dates}</span>
                <span className="mt-2 block text-[10px] uppercase tracking-[0.14em] text-saffron-400/70">
                  {sign.element}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-cream-300/40">
            <Sparkles size={13} className="text-saffron-400" />
            Результат можно превратить в маршрут и позвать друзей.
          </p>
        </div>
      </div>
    </div>
  )
}
