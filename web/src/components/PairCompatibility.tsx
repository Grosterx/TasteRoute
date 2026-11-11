import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Copy,
  Heart,
  HeartHandshake,
  RotateCcw,
  Share2,
  Smartphone,
  Sparkles,
  User,
  Users,
} from 'lucide-react'
import {
  encodePairAnswers,
  findPairAnswers,
  pairAxes,
  pairCompatibility,
  pairProfile,
  pairQuestions,
  pairSharedAxis,
  pairVerdict,
} from '../lib/fun'
import { Button } from './ui/Button'

type Stage = 'intro' | 'first' | 'handoff' | 'second' | 'result'

type ShareState = 'idle' | 'copied' | 'error'

export function PairCompatibility() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hash } = useLocation()
  const shared = findPairAnswers(searchParams.get('pair'))
  const [stage, setStage] = useState<Stage>(shared ? 'result' : 'intro')
  const [step, setStep] = useState(0)
  const [firstAnswers, setFirstAnswers] = useState<Record<string, string>>(shared?.first ?? {})
  const [secondAnswers, setSecondAnswers] = useState<Record<string, string>>(shared?.second ?? {})
  const [shareState, setShareState] = useState<ShareState>('idle')

  useEffect(() => {
    const next = findPairAnswers(searchParams.get('pair'))
    if (next) {
      setFirstAnswers(next.first)
      setSecondAnswers(next.second)
      setStage('result')
    }
  }, [searchParams])

  useEffect(() => {
    if (hash === '#pair' || searchParams.get('pair')) {
      document.getElementById('pair')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const restart = () => {
    setStage('intro')
    setStep(0)
    setFirstAnswers({})
    setSecondAnswers({})
    setSearchParams({}, { replace: true })
  }

  const answer = (optionId: string) => {
    const question = pairQuestions[step]
    if (stage === 'first') {
      const next = { ...firstAnswers, [question.id]: optionId }
      setFirstAnswers(next)
      if (step < pairQuestions.length - 1) {
        setStep(step + 1)
        return
      }
      setStage('handoff')
      setStep(0)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const next = { ...secondAnswers, [question.id]: optionId }
    setSecondAnswers(next)
    if (step < pairQuestions.length - 1) {
      setStep(step + 1)
      return
    }
    setStage('result')
    setSearchParams({ pair: encodePairAnswers(firstAnswers, next) }, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const firstProfile = pairProfile(firstAnswers)
  const secondProfile = pairProfile(secondAnswers)
  const percent = pairCompatibility(firstProfile, secondProfile)
  const verdict = pairVerdict(percent)
  const sharedAxis = pairAxes.find((axis) => axis.id === pairSharedAxis(firstProfile, secondProfile))
  const pairUrl = `${window.location.origin}/fun?pair=${encodeURIComponent(
    encodePairAnswers(firstAnswers, secondAnswers),
  )}`

  const share = async () => {
    const text = `Наша гастро-совместимость: ${percent}% — ${verdict.title}. Проверьте свою: ${pairUrl}`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Гастро-совместимость', text })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setShareState('copied')
      window.setTimeout(() => setShareState('idle'), 2200)
    } catch {
      setShareState('error')
      window.setTimeout(() => setShareState('idle'), 2200)
    }
  }

  const question = pairQuestions[step]
  const progress = Math.round(((step + 1) / pairQuestions.length) * 100)

  return (
    <section id="pair" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Heart size={14} className="text-tomato-400" />
            Тест на двоих
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-cream-50 sm:text-4xl">
            Гастро-совместимость
            <span className="block text-saffron-300">вашей пары</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-300/60">
            Пять вопросов о еде — сначала один, потом второй. В конце — процент совпадения вкусов и
            вердикт, можно ли вам за одним столом.
          </p>
        </div>
        {stage === 'result' ? (
          <div className="flex shrink-0 gap-3 text-xs text-cream-300/55">
            <span className="rounded-full border border-cream-200/10 px-3 py-1.5">5 вопросов</span>
            <span className="rounded-full border border-cream-200/10 px-3 py-1.5">
              {percent}% совпадение
            </span>
          </div>
        ) : null}
      </div>

      {stage === 'intro' ? (
        <div className="surface relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-tomato-400/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-6 p-7 text-center sm:p-9">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-tomato-400 text-ink-950">
              <HeartHandshake size={26} />
            </div>
            <p className="max-w-md text-sm leading-relaxed text-cream-300/60">
              Каждый отвечает на пять коротких вопросов про еду. Передайте телефон партнёру, когда
              закончите, — результат появится сразу после его ответов.
            </p>
            <Button
              size="lg"
              onClick={() => {
                setStage('first')
                setStep(0)
              }}
            >
              <User size={18} />
              Первый игрок — начать
              <ArrowRight size={18} />
            </Button>
            <p className="text-xs text-cream-300/40">
              Без регистрации · 1 минута на двоих · результат можно отправить друзьям
            </p>
          </div>
        </div>
      ) : null}

      {stage === 'first' || stage === 'second' ? (
        <div className="surface mx-auto max-w-2xl p-7 sm:p-9">
          <div className="flex items-center justify-between gap-4 text-xs text-cream-300/50">
            <span className="flex items-center gap-1.5">
              {stage === 'first' ? <User size={13} className="text-saffron-400" /> : null}
              {stage === 'second' ? <Users size={13} className="text-saffron-400" /> : null}
              Отвечает {stage === 'first' ? 'первый' : 'второй'}
            </span>
            <span>
              Вопрос {step + 1} из {pairQuestions.length} · {progress}%
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream-50/[0.06]">
            <div
              className="h-full rounded-full bg-saffron-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <h3 className="mt-7 font-display text-3xl font-bold leading-tight text-cream-50">
            {question.title}
          </h3>

          <div className="mt-6 grid gap-3">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => answer(option.id)}
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
        </div>
      ) : null}

      {stage === 'handoff' ? (
        <div className="surface mx-auto max-w-xl p-7 text-center sm:p-9">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-saffron-400/10 text-saffron-300">
            <Smartphone size={28} />
          </div>
          <h3 className="mt-5 font-display text-3xl font-bold text-cream-50">Передайте телефон</h3>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream-300/60">
            Первый игрок закончил. Теперь те же пять вопросов отвечает второй — не подглядывайте в
            чужие ответы, так честнее и веселее.
          </p>
          <Button
            size="lg"
            className="mt-7"
            onClick={() => {
              setStage('second')
              setStep(0)
            }}
          >
            <Users size={18} />
            Второй игрок — ко мне
          </Button>
        </div>
      ) : null}

      {stage === 'result' ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="surface relative overflow-hidden p-7 text-center sm:p-9"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-saffron-400/10 blur-3xl" />
            <div className="relative">
              <p className="eyebrow">Ваша гастро-совместимость</p>
              <div className="mx-auto mt-5 grid h-28 w-28 place-items-center rounded-full border-4 border-saffron-400/40">
                <span className="font-display text-4xl font-black text-saffron-300">{percent}%</span>
              </div>
              <h3 className="mt-6 font-display text-3xl font-bold text-cream-50">{verdict.title}</h3>
              <p className="mt-1.5 text-sm text-cream-200/70">{verdict.subtitle}</p>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream-200/70">
                {verdict.description}
              </p>
              {sharedAxis ? (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-saffron-400/20 bg-saffron-400/10 px-3.5 py-1.5 text-xs font-medium text-saffron-300">
                  <Sparkles size={13} />
                  Ваш общий язык — {sharedAxis.label}
                </p>
              ) : null}
            </div>
          </motion.div>

          <div className="surface p-6 sm:p-8">
            <p className="eyebrow">Как легли вкусы</p>
            <div className="mt-5 space-y-4">
              {pairAxes.map((axis) => {
                const firstValue = firstProfile[axis.id]
                const secondValue = secondProfile[axis.id]
                const max = Math.max(firstValue, secondValue, 1)
                return (
                  <div key={axis.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-[0.14em] text-cream-300/50">
                        {axis.label}
                      </span>
                      <span className="text-cream-300/40">
                        {firstValue} / {secondValue}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div className="h-2 overflow-hidden rounded-full bg-cream-50/[0.06]">
                        <div
                          className="h-full rounded-full bg-saffron-400"
                          style={{ width: `${(firstValue / max) * 100}%` }}
                        />
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-cream-50/[0.06]">
                        <div
                          className="h-full rounded-full bg-basil-400"
                          style={{ width: `${(secondValue / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 flex items-center gap-5 text-xs text-cream-300/50">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-saffron-400" />
                Первый
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-basil-400" />
                Второй
              </span>
            </div>
          </div>

          <div className="surface space-y-5 p-6 sm:p-8">
            <div>
              <p className="eyebrow">Проверено звёздами вкуса</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-cream-50 sm:text-3xl">
                Зафиксируйте результат за общим столом
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-cream-300/60">
                Соберите комнату на двоих: свайпайте блюда вместе и смотрите, что совпадёт.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Link
                to="/create"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-tomato-400 px-6 text-sm font-bold text-ink-950 transition hover:bg-tomato-400/90"
              >
                <Sparkles size={17} />
                Создать комнату на двоих
              </Link>
              <Button variant="secondary" className="h-12" onClick={share}>
                {shareState === 'copied' ? (
                  <Check size={17} />
                ) : shareState === 'error' ? (
                  <Copy size={17} />
                ) : (
                  <Share2 size={17} />
                )}
                {shareState === 'copied'
                  ? 'Ссылка скопирована'
                  : shareState === 'error'
                    ? 'Не удалось'
                    : 'Поделиться'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cream-200/10 pt-4">
              <button
                type="button"
                onClick={restart}
                className="inline-flex items-center gap-2 text-sm font-medium text-cream-300/55 transition hover:text-cream-50"
              >
                <RotateCcw size={15} />
                Пройти заново
              </button>
              <Link
                to="/fun"
                className="text-sm font-medium text-saffron-300 transition hover:text-saffron-400"
              >
                Все гастро-фишки
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
