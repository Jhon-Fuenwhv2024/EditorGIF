/** Lectura tipada de variables Vite públicas. Nunca inventa IDs ni precios. */

import { DEFAULT_SITE_URL, normalizeSiteUrl } from '../../shared/site'

export { DEFAULT_SITE_URL }

export function siteUrl(): string {
  // Prioridad: VITE_SITE_URL → origen actual en el navegador → dominio de producción.
  const fromEnv = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim()
  if (fromEnv) return normalizeSiteUrl(fromEnv)
  if (typeof window !== 'undefined' && window.location?.origin) {
    // En local (localhost/127.0.0.1) preferimos el origen real para Share/API.
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return window.location.origin
    }
    return window.location.origin.replace(/\/$/, '')
  }
  return DEFAULT_SITE_URL
}

export function adsenseClient(): string | null {
  const v = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined)?.trim()
  return v || null
}

export function adsenseSlot(kind: 'convert' | 'result'): string | null {
  const key =
    kind === 'convert'
      ? 'VITE_ADSENSE_SLOT_CONVERT'
      : 'VITE_ADSENSE_SLOT_RESULT'
  const v = (import.meta.env[key] as string | undefined)?.trim()
  return v || null
}

export function proPriceLabel(): string | null {
  const v = (import.meta.env.VITE_PRO_PRICE_LABEL as string | undefined)?.trim()
  return v || null
}

export function stripePublishableKey(): string | null {
  const v = (
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined
  )?.trim()
  return v || null
}

export function freeMaxMb(): number {
  const n = Number(import.meta.env.VITE_FREE_MAX_MB)
  return Number.isFinite(n) && n > 0 ? n : 60
}

export function proMaxMb(): number {
  const n = Number(import.meta.env.VITE_PRO_MAX_MB)
  return Number.isFinite(n) && n > 0 ? n : 100
}

export function maxBytesForPlan(isPro: boolean): number {
  return (isPro ? proMaxMb() : freeMaxMb()) * 1024 * 1024
}

/** Misma versión que dependency @ffmpeg/core (pin fijo para el CDN). */
export const FFMPEG_CORE_VERSION = '0.12.6'

/**
 * Base URL del core single-thread (sin barra final).
 * Default: jsDelivr con CORS + Cross-Origin-Resource-Policy: cross-origin
 * (compatible con COEP credentialless + toBlobURL).
 */
export function ffmpegBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_FFMPEG_BASE_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`
}
