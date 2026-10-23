import { Check, Copy, Users } from 'lucide-react'
import { useState } from 'react'
import { shareURL } from '../lib/api'
import { Button } from './ui/Button'

type RoomChromeProps = {
  code: string
  participants: number
  connected: boolean
}

export function RoomChrome({ code, participants, connected }: RoomChromeProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareURL(code))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="glass flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-saffron-400/20 bg-saffron-400/10 px-4 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-saffron-300/70">Код</p>
          <p className="font-display text-2xl font-bold tracking-[0.18em] text-saffron-300">{code}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-cream-100">
            <Users size={16} className="text-basil-400" />
            {participants} / 8 в комнате
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-cream-300/50">
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-basil-400' : 'bg-cream-300/30'}`}
            />
            {connected ? 'онлайн' : 'подключаемся'}
          </p>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={copy} className="self-start sm:self-auto">
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? 'Ссылка скопирована' : 'Пригласить друзей'}
      </Button>
    </div>
  )
}
