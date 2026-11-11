import { useMemo } from 'react'
import { motion } from 'framer-motion'

const colors = ['#f7b84b', '#ffd37a', '#6fbf8b', '#f07d63', '#fffaf1', '#e79a20']

type ConfettiProps = {
  active: boolean
  count?: number
}

type Particle = {
  id: number
  angle: number
  distance: number
  size: number
  color: string
  delay: number
  duration: number
  rotate: number
  round: boolean
}

export function Confetti({ active, count = 28 }: ConfettiProps) {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, (_, index) => ({
        id: index,
        angle: (index / count) * 360 + Math.random() * 18,
        distance: 80 + Math.random() * 130,
        size: 6 + Math.random() * 7,
        color: colors[index % colors.length],
        delay: Math.random() * 0.15,
        duration: 1 + Math.random() * 0.5,
        rotate: (Math.random() - 0.5) * 720,
        round: Math.random() > 0.55,
      })),
    [count],
  )

  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute left-1/2 top-1/2"
          style={{
            width: particle.size,
            height: particle.round ? particle.size : particle.size * 1.6,
            backgroundColor: particle.color,
            borderRadius: particle.round ? '9999px' : '2px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.5 }}
          animate={{
            x: Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
            y: Math.sin((particle.angle * Math.PI) / 180) * particle.distance + 24,
            opacity: 0,
            rotate: particle.rotate,
            scale: 1,
          }}
          transition={{ duration: particle.duration, delay: particle.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
