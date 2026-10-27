/** URL pública por defecto del sitio (configurable con VITE_SITE_URL). */
export const DEFAULT_SITE_URL = 'https://videogif.trainfit.cloud'

export function normalizeSiteUrl(raw: string | undefined | null): string {
  const value = (raw || '').trim().replace(/\/$/, '')
  return value || DEFAULT_SITE_URL
}
