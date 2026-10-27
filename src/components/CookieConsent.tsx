import { adsenseClient } from '../lib/env'
import { usePro } from '../lib/pro'

/** Banner básico de cookies. Solo aparece si AdSense está configurado y aún no hay decisión. */
export function CookieConsent() {
  const { cookieConsent, setCookieConsent } = usePro()
  const client = adsenseClient()

  if (!client || cookieConsent !== null) return null

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--ink)] p-4 text-[var(--foam)] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] sm:p-5"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="cookie-title" className="font-display text-lg">
            Cookies y anuncios
          </h2>
          <p id="cookie-desc" className="mt-1 text-sm text-[var(--foam)]/80">
            Usamos cookies de Google AdSense para mostrar anuncios. La conversión
            del GIF sigue siendo local. Puedes rechazar los anuncios y seguir
            usando Fotogif. Más en{' '}
            <a href="/privacidad" className="underline underline-offset-2">
              Privacidad
            </a>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="focus-ring rounded-full border border-white/30 px-4 py-2 text-sm font-semibold"
            onClick={() => setCookieConsent('rejected')}
          >
            Rechazar
          </button>
          <button
            type="button"
            className="focus-ring rounded-full bg-[var(--lime)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            onClick={() => setCookieConsent('accepted')}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
