import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, EyeOff, Heart, Sparkles } from 'lucide-react'
import { Button } from './ui/Button'
import { Confetti } from './Confetti'

type MatchOverlayProps = {
  open: boolean
  dishName?: string
  likes: number
  reveal?: boolean
  addedLabel?: string
  routeHref?: string
  routeLabel?: string
  onClose: () => void
}

export function MatchOverlay({
  open,
  dishName,
  likes,
  reveal,
  addedLabel = 'Добавлено в маршрут',
  routeHref,
  routeLabel = 'К маршруту',
  onClose,
}: MatchOverlayProps) {
  useEffect(() => {
    if (!open) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 40, 30])
    }
  }, [open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.86, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="surface relative w-full max-w-sm overflow-hidden p-7 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <Confetti active={open} />
            <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-saffron-400/15 blur-3xl" />
            <div className="absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-basil-400/15 blur-3xl" />
            <div className="relative">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-saffron-400 text-ink-950 shadow-glow">
                <Heart size={30} fill="currentColor" />
              </div>
              <p className="eyebrow mt-6">Совпадение</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-cream-50">
                {dishName ?? 'Это блюдо хотят все'}
              </h2>
              {reveal ? (
                <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-saffron-400/30 bg-saffron-400/10 px-3.5 py-1.5 text-xs font-semibold text-saffron-300">
                  <EyeOff size={13} />
                  Секретное блюдо раскрыто
                </p>
              ) : null}
              <p className="mt-3 text-sm text-cream-300/65">
                {likes} {likes === 1 ? 'лайк' : likes < 5 ? 'лайка' : 'лайков'} в комнате.
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-basil-400/25 bg-basil-400/10 px-3.5 py-1.5 text-xs font-semibold text-basil-400">
                <Sparkles size={13} />
                {addedLabel}
              </p>
              <div className="mt-7 flex flex-col gap-2">
                {routeHref ? (
                  <Link
                    to={routeHref}
                    onClick={onClose}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-5 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
                  >
                    {routeLabel}
                    <ArrowRight size={16} />
                  </Link>
                ) : null}
                <Button
                  className="w-full"
                  variant={routeHref ? 'secondary' : 'primary'}
                  onClick={onClose}
                >
                  Продолжить свайпы
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
