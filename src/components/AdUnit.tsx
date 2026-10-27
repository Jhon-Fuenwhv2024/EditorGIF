import { useEffect, useRef } from 'react'
import { adsenseClient, adsenseSlot } from '../lib/env'
import { usePro } from '../lib/pro'

type Props = {
  slot: 'convert' | 'result'
  className?: string
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

/**
 * Solo monta AdSense si hay VITE_ADSENSE_CLIENT, consentimiento de cookies
 * y el usuario no es Pro. Sin variable de entorno no se muestra nada.
 */
export function AdUnit({ slot, className = '' }: Props) {
  const { isPro, cookieConsent } = usePro()
  const client = adsenseClient()
  const slotId = adsenseSlot(slot)
  const pushed = useRef(false)

  const enabled =
    Boolean(client) &&
    Boolean(slotId) &&
    cookieConsent === 'accepted' &&
    !isPro

  useEffect(() => {
    if (!enabled || !client) return

    const existing = document.querySelector(
      'script[data-fotogif-adsense="1"]',
    ) as HTMLScriptElement | null
    if (!existing) {
      const s = document.createElement('script')
      s.async = true
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
      s.crossOrigin = 'anonymous'
      s.dataset.fotogifAdsense = '1'
      document.head.appendChild(s)
    }

    if (pushed.current) return
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
      pushed.current = true
    } catch {
      /* ignore */
    }
  }, [enabled, client])

  if (!enabled || !client || !slotId) return null

  return (
    <aside
      className={`w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-white/50 p-3 ${className}`}
      aria-label="Anuncio"
    >
      <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-[var(--ink)]/40">
        Publicidad
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 90 }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
