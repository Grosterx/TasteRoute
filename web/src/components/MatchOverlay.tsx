import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Sparkles } from 'lucide-react'
import { Button } from './ui/Button'

type MatchOverlayProps = {
  open: boolean
  dishName?: string
  likes: number
  onClose: () => void
}

export function MatchOverlay({ open, dishName, likes, onClose }: MatchOverlayProps) {
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
              <p className="mt-3 text-sm text-cream-300/65">
                {likes} {likes === 1 ? 'лайк' : likes < 5 ? 'лайка' : 'лайков'} в комнате. Добавим
                точку в маршрут?
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-saffron-300">
                <Sparkles size={15} />
                <span>Вкус найдёт дорогу</span>
              </div>
              <Button className="mt-7 w-full" onClick={onClose}>
                Продолжить свайпы
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
