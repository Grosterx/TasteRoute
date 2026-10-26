import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Sandwich, Sparkles } from 'lucide-react'
import type { FunResult } from '../lib/fun'
import { findShawarmaResult, resolveShawarma, shawarmaQuestions } from '../lib/fun'
import { Button } from '../components/ui/Button'
import { FunResultCard } from '../components/FunResultCard'

export function ShawarmaQuiz() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sharedResult = findShawarmaResult(searchParams.get('result'))
  const [result, setResult] = useState<FunResult | null>(sharedResult)
  const [started, setStarted] = useState(Boolean(sharedResult))
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    const next = findShawarmaResult(searchParams.get('result'))
    if (next) {
      setResult(next)
      setStarted(true)
      return
    }
    setResult(null)
    setStarted(false)
    setStep(0)
    setAnswers({})
  }, [searchParams])

  const question = shawarmaQuestions[step]
  const progress = Math.round(((step + 1) / shawarmaQuestions.length) * 100)

  const choose = (optionId: string) => {
    const nextAnswers = { ...answers, [question.id]: optionId }
    setAnswers(nextAnswers)

    if (step < shawarmaQuestions.length - 1) {
      setStep(step + 1)
      return
    }

    const nextResult = resolveShawarma(nextAnswers)
    setResult(nextResult)
    setSearchParams({ result: nextResult.id }, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const back = () => {
    if (step === 0) {
      setStarted(false)
      return
    }
    setStep(step - 1)
  }

  const restart = () => {
    setResult(null)
    setStarted(false)
    setStep(0)
    setAnswers({})
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
          featureLabel="Какая ты шаурма сегодня"
          onRestart={restart}
          restartLabel="Пройти тест заново"
        />
      </div>
    )
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          to="/fun"
          className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
        >
          <ArrowLeft size={16} />
          К гастро-фишкам
        </Link>

        <div className="surface mt-6 overflow-hidden">
          <div className="relative overflow-hidden border-b border-cream-200/10 bg-gradient-to-br from-saffron-500/25 via-saffron-400/10 to-transparent p-7 sm:p-9">
            <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-saffron-400/15 blur-3xl" />
            <div className="relative">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-saffron-400 text-ink-950 shadow-glow">
                <Sandwich size={27} />
              </div>
              <p className="eyebrow mt-6">Гастро-тест</p>
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
                Какая ты шаурма
                <span className="block text-saffron-300">сегодня?</span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-cream-300/65 sm:text-base">
                Три вопроса про настроение, соус и компанию. В конце — твой гастро-характер, с
                которым можно сразу отправиться за общим столом.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-cream-200/60">
                <span className="rounded-full border border-cream-200/10 bg-cream-50/[0.04] px-3 py-1">
                  3 вопроса
                </span>
                <span className="rounded-full border border-cream-200/10 bg-cream-50/[0.04] px-3 py-1">
                  30 секунд
                </span>
                <span className="rounded-full border border-cream-200/10 bg-cream-50/[0.04] px-3 py-1">
                  без регистрации
                </span>
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-9">
            <Button size="lg" className="w-full" onClick={() => setStarted(true)}>
              <Sparkles size={18} />
              Начать тест
              <ArrowRight size={18} />
            </Button>
            <p className="mt-3 text-center text-xs leading-relaxed text-cream-300/40">
              Результат можно превратить в маршрут и позвать друзей.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        to="/fun"
        className="inline-flex items-center gap-2 text-sm text-cream-300/55 transition hover:text-cream-50"
      >
        <ArrowLeft size={16} />
        К гастро-фишкам
      </Link>

      <div className="surface p-7 sm:p-9">
        <div className="flex items-center justify-between gap-4 text-xs text-cream-300/50">
          <span>
            Вопрос {step + 1} из {shawarmaQuestions.length}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream-50/[0.06]">
          <div
            className="h-full rounded-full bg-saffron-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="eyebrow mt-7">{question.hint}</p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-cream-50 sm:text-4xl">
          {question.title}
        </h1>

        <div className="mt-6 grid gap-3">
          {question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => choose(option.id)}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-cream-200/10 bg-cream-50/[0.025] px-5 py-4 text-left text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40 hover:bg-saffron-400/[0.06]"
            >
              {option.label}
              <ArrowRight
                size={17}
                className="shrink-0 text-saffron-400 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-2 text-sm font-medium text-cream-300/55 transition hover:text-cream-50"
          >
            <ArrowLeft size={15} />
            Назад
          </button>
          <span className="text-xs text-cream-300/35">
            Осталось {shawarmaQuestions.length - step}
          </span>
        </div>
      </div>
    </div>
  )
}
