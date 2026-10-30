import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { Check, Copy, Download, ExternalLink, Loader2, QrCode } from 'lucide-react'
import { placeURL } from '../lib/api'
import { getRestaurantSession } from '../lib/restaurantSession'
import { Button } from '../components/ui/Button'

export function RestaurantQR() {
  const session = getRestaurantSession()
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const url = session ? placeURL(session.restaurant.slug, 'qr') : ''

  useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, {
      width: 720,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: { dark: '#0d0b09', light: '#fffaf1' },
    })
      .then(setQr)
      .catch(() => setQr(null))
  }, [url])

  if (!session) return <Navigate to="/restaurant/login" replace />

  const copy = async () => {
    await navigator.clipboard?.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="surface flex flex-col items-center p-6 text-center sm:p-8">
        <div className="flex items-center gap-2 text-saffron-300">
          <QrCode size={18} />
          <p className="eyebrow">QR для столов</p>
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold text-cream-50">{session.restaurant.name}</h1>
        <p className="mt-2 text-sm text-cream-300/55">
          Гость сканирует код и попадает на меню ресторана.
        </p>

        <div className="mt-6 w-full max-w-xs rounded-3xl bg-[#fffaf1] p-4 shadow-card">
          {qr ? (
            <img src={qr} alt={`QR для ${session.restaurant.name}`} className="w-full" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-ink-950/50">
              <Loader2 size={28} className="animate-spin" />
            </div>
          )}
        </div>

        <p className="mt-4 break-all text-[11px] text-cream-300/40">{url}</p>

        <div className="mt-5 flex w-full flex-col gap-2">
          <Button onClick={copy} variant="secondary" className="w-full">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Скопировано' : 'Скопировать ссылку'}
          </Button>
          {qr ? (
            <a
              href={qr}
              download={`tasteroute-${session.restaurant.slug}.png`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-saffron-400 px-5 text-sm font-bold text-ink-950 transition hover:bg-saffron-300"
            >
              <Download size={16} />
              Скачать PNG
            </a>
          ) : null}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cream-200/15 px-5 text-sm font-semibold text-cream-100 transition hover:border-saffron-400/40"
          >
            <ExternalLink size={16} />
            Открыть страницу
          </a>
        </div>
      </div>

      <div className="space-y-4">
        <div className="surface p-6">
          <p className="eyebrow">Как использовать</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-cream-50">Три простых шага</h2>
          <ol className="mt-5 space-y-4 text-sm text-cream-200/70">
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-saffron-400/15 text-xs font-bold text-saffron-300">
                1
              </span>
              Скачайте PNG и распечатайте на табличках или вкладышах для столов.
            </li>
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-saffron-400/15 text-xs font-bold text-saffron-300">
                2
              </span>
              Подпишите: «Соберите компанию и выберите блюда вместе».
            </li>
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-saffron-400/15 text-xs font-bold text-saffron-300">
                3
              </span>
              Гости создают комнату, свайпают меню и оставляют бронь в вашем кабинете.
            </li>
          </ol>
        </div>

        <div className="surface p-6">
          <p className="eyebrow">Что важно</p>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-cream-300/60">
            <p>
              QR ведёт на вашу публичную страницу. В аналитике такие переходы помечаются как
              источник «QR».
            </p>
            <p>
              Бронь не подтверждается автоматически: гость оставляет заявку, а вы подтверждаете её
              в разделе «Брони».
            </p>
            <p>
              Если нужно поменять ссылку или slug, это делает администратор TasteRoute.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
