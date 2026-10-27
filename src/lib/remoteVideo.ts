import { isAcceptedVideo } from './format'
import { resolveSourceUrl } from '../../shared/remote-download'

export { resolveSourceUrl }

export type RemoteFetchProgress = {
  phase: 'resolving' | 'downloading' | 'ready'
  message: string
}

/**
 * Descarga un video desde URL (directa, Google Drive o Dropbox).
 * 1) Intenta fetch directo en el navegador (si hay CORS).
 * 2) Si falla, usa el proxy `/api/fetch-video` (Vite en local / Netlify en producción).
 */
export async function fetchVideoFromUrl(
  rawUrl: string,
  onProgress?: (p: RemoteFetchProgress) => void,
): Promise<File> {
  onProgress?.({ phase: 'resolving', message: 'Resolviendo enlace…' })
  const resolved = resolveSourceUrl(rawUrl)

  onProgress?.({
    phase: 'downloading',
    message:
      resolved.kind === 'google-drive'
        ? 'Descargando desde Google Drive…'
        : resolved.kind === 'dropbox'
          ? 'Descargando desde Dropbox…'
          : 'Descargando video…',
  })

  try {
    const direct = await tryDirectDownload(resolved.url)
    if (direct) {
      onProgress?.({ phase: 'ready', message: 'Video listo' })
      return direct
    }
  } catch {
    // Seguimos con el proxy
  }

  const proxied = await downloadViaProxy(rawUrl)
  onProgress?.({ phase: 'ready', message: 'Video listo' })
  return proxied
}

async function tryDirectDownload(url: string): Promise<File | null> {
  const res = await fetch(url, {
    mode: 'cors',
    credentials: 'omit',
    redirect: 'follow',
  })
  if (!res.ok) return null

  const type = res.headers.get('content-type') || ''
  if (type.includes('text/html')) return null

  const blob = await res.blob()
  if (blob.size < 64) return null
  if (type.includes('text/html')) return null

  // Si el servidor no manda video/*, igual aceptamos binarios razonables
  const filename = guessFilename(res, url)
  const file = new File([blob], filename, {
    type: blob.type || guessMime(filename),
  })
  if (!isAcceptedVideo(file) && !blob.type.startsWith('video/')) {
    // Algunos hosts mandan application/octet-stream
    if (!/\.(mp4|webm|mov|m4v)$/i.test(filename) && !blob.type.includes('octet-stream')) {
      return null
    }
  }
  return file
}

async function downloadViaProxy(rawUrl: string): Promise<File> {
  const res = await fetch('/api/fetch-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: rawUrl }),
  })

  const contentType = res.headers.get('content-type') || ''
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as { error?: string }
      throw new Error(data.error || `No se pudo descargar (HTTP ${res.status})`)
    }
    throw new Error(
      `No se pudo importar el video (HTTP ${res.status}). Comprueba el enlace e inténtalo de nuevo, o selecciona el archivo.`,
    )
  }

  const blob = await res.blob()
  const headerName = res.headers.get('X-Fotogif-Filename')
  const filename = headerName
    ? decodeURIComponent(headerName)
    : guessFilename(res, rawUrl)

  return new File([blob], filename, {
    type: blob.type || guessMime(filename),
  })
}

function guessFilename(res: Response, url: string): string {
  const cd = res.headers.get('content-disposition')
  if (cd) {
    const m = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
    if (m?.[1]) {
      try {
        return decodeURIComponent(m[1].replace(/"/g, ''))
      } catch {
        return m[1]
      }
    }
  }
  try {
    const path = new URL(url).pathname
    const base = path.split('/').pop()
    if (base && base.includes('.')) return base
  } catch {
    /* ignore */
  }
  return 'video.mp4'
}

function guessMime(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.mov')) return 'video/quicktime'
  if (lower.endsWith('.m4v')) return 'video/x-m4v'
  return 'video/mp4'
}
