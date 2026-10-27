import { useState } from 'react'
import { proPriceLabel } from '../lib/env'
import { usePro } from '../lib/pro'

export function ProPanel() {
  const { email, isPro, loading, setEmailAndRefresh } = usePro()
  const [input, setInput] = useState(email || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const label = proPriceLabel()

  async function startCheckout() {
    setMessage(null)
    const value = input.trim().toLowerCase()
    if (!value.includes('@')) {
      setMessage('Escribe un email válido para el checkout.')
      return
    }
    setBusy(true)
    try {
      await setEmailAndRefresh(value)
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'No se pudo iniciar Stripe Checkout')
      }
      window.location.href = data.url
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error de checkout')
    } finally {
      setBusy(false)
    }
  }

  async function openPortal() {
    setMessage(null)
    const value = (input || email || '').trim().toLowerCase()
    if (!value.includes('@')) {
      setMessage('Escribe el email de tu suscripción.')
      return
    }
    setBusy(true)
    try {
      await setEmailAndRefresh(value)
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'No se pudo abrir el portal')
      }
      window.location.href = data.url
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error del portal')
    } finally {
      setBusy(false)
    }
  }

  async function restore() {
    setMessage(null)
    const value = input.trim().toLowerCase()
    if (!value.includes('@')) {
      setMessage('Escribe el email con el que pagaste.')
      return
    }
    setBusy(true)
    try {
      await setEmailAndRefresh(value)
      const res = await fetch('/api/pro-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      const data = (await res.json()) as {
        isPro?: boolean
        configured?: boolean
        error?: string
        message?: string
      }
      if (!res.ok) throw new Error(data.error || 'No se pudo restaurar')
      if (data.configured === false) {
        setMessage(
          data.message ||
            'Stripe no está configurado aún. Añade las variables en Netlify.',
        )
        return
      }
      setMessage(
        data.isPro
          ? '¡Pro restaurado! Sin anuncios, sin marca de agua y más límite por enlace.'
          : 'No hay suscripción Pro activa para ese email.',
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al restaurar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="rounded-[1.75rem] border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow)] backdrop-blur-sm sm:p-6"
      aria-labelledby="pro-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--coral)]">
            Fotogif Pro
          </p>
          <h2 id="pro-heading" className="font-display mt-1 text-2xl text-[var(--ink)]">
            {isPro ? 'Tu plan Pro está activo' : 'Quita anuncios y marca de agua'}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--ink)]/70">
            Pro: sin anuncios, sin «hecho con Fotogif» en el GIF y mayor tamaño al
            importar por enlace.
            {label ? (
              <>
                {' '}
                <span className="font-medium text-[var(--ink)]">{label}</span>
              </>
            ) : (
              <> El precio lo verás en el checkout de Stripe (modo prueba o live).</>
            )}
          </p>
        </div>
        {isPro && (
          <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--lime)]">
            Pro
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <label className="sr-only" htmlFor="pro-email">
          Email de la suscripción
        </label>
        <input
          id="pro-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={input}
          disabled={busy || loading}
          onChange={(e) => setInput(e.target.value)}
          className="focus-ring min-w-0 flex-1 rounded-full border border-[var(--line)] bg-white/90 px-4 py-3 text-base"
        />
        {isPro ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void openPortal()}
            className="focus-ring rounded-full border border-[var(--ink)]/20 bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] disabled:opacity-50"
          >
            Gestionar / cancelar
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void restore()}
              className="focus-ring rounded-full border border-[var(--ink)]/20 bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] disabled:opacity-50"
            >
              Restaurar compra
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void startCheckout()}
              className="focus-ring rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--lime)] disabled:opacity-50"
            >
              {busy ? 'Redirigiendo…' : 'Hazte Pro'}
            </button>
          </>
        )}
      </div>

      {message && (
        <p className="mt-3 text-sm font-medium text-[var(--ink)]/75" role="status">
          {message}
        </p>
      )}
    </section>
  )
}
