/** Lógica compartida: resolver enlaces (Drive/Dropbox/…) y descargar con límites seguros. */

export const MAX_BYTES = 50 * 1024 * 1024 // ~50 MB por enlace

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
])

export type ResolvedSource = {
  url: string
  kind: 'google-drive' | 'dropbox' | 'direct'
  label: string
}

export type DownloadedVideo = {
  bytes: Uint8Array
  contentType: string
  filename: string
  sourceUrl: string
}

export function extractGoogleDriveId(raw: string): string | null {
  try {
    const u = new URL(raw.trim())
    const host = u.hostname.replace(/^www\./, '')
    if (host !== 'drive.google.com' && host !== 'docs.google.com') return null

    const fromPath = u.pathname.match(/\/file\/d\/([^/]+)/)
    if (fromPath?.[1]) return fromPath[1]

    const id = u.searchParams.get('id')
    if (id) return id

    const open = u.pathname.match(/\/open\/?$/)
    if (open && u.searchParams.get('id')) return u.searchParams.get('id')

    return null
  } catch {
    return null
  }
}

export function resolveSourceUrl(raw: string): ResolvedSource {
  const trimmed = raw.trim()
  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    throw new Error('La URL no es válida. Debe empezar por https://')
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Solo se permiten enlaces http o https.')
  }

  const driveId = extractGoogleDriveId(trimmed)
  if (driveId) {
    return {
      kind: 'google-drive',
      label: 'Google Drive',
      url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}&confirm=t`,
    }
  }

  const host = u.hostname.replace(/^www\./, '')
  if (host === 'dropbox.com' || host.endsWith('.dropbox.com')) {
    u.searchParams.set('dl', '1')
    return { kind: 'dropbox', label: 'Dropbox', url: u.toString() }
  }

  return { kind: 'direct', label: 'enlace directo', url: u.toString() }
}

export function assertPublicHttpUrl(urlString: string): URL {
  const u = new URL(urlString)
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Protocolo no permitido.')
  }

  const host = u.hostname.toLowerCase()
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('No se puede acceder a esa dirección.')
  }

  // Bloqueo básico SSRF de IPs privadas / link-local
  if (isPrivateOrLocalIp(host)) {
    throw new Error('No se puede acceder a direcciones privadas.')
  }

  return u
}

function isPrivateOrLocalIp(host: string): boolean {
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  }
  if (host.includes(':')) {
    const h = host.replace(/^\[|\]$/g, '').toLowerCase()
    if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
      return true
    }
  }
  return false
}

function filenameFromHeaders(contentDisposition: string | null, fallbackUrl: string): string {
  if (contentDisposition) {
    const utf = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf?.[1]) {
      try {
        return decodeURIComponent(utf[1].replace(/["']/g, ''))
      } catch {
        /* ignore */
      }
    }
    const plain = contentDisposition.match(/filename="?([^";]+)"?/i)
    if (plain?.[1]) return plain[1]
  }

  try {
    const path = new URL(fallbackUrl).pathname
    const base = path.split('/').pop() || 'video.mp4'
    if (base.includes('.')) return base
  } catch {
    /* ignore */
  }
  return 'video.mp4'
}

function guessContentType(filename: string, header: string | null): string {
  if (header && header.startsWith('video/')) return header
  const lower = filename.toLowerCase()
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.mov')) return 'video/quicktime'
  if (lower.endsWith('.m4v')) return 'video/x-m4v'
  return 'video/mp4'
}

function looksLikeHtml(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.slice(0, 200)).trim().toLowerCase()
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.includes('<html')
}

function extractDriveConfirm(html: string, fileId: string): string | null {
  const patterns = [
    /confirm=([0-9A-Za-z_-]+)/,
    /name="confirm"\s+value="([^"]+)"/,
    /"downloadUrl"[^"]*"([^"]*confirm=([^"&]+)[^"]*)"/,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) {
      const token = m[2] || m[1]
      if (token && token !== 't') return token
    }
  }
  // Enlaces tipo /uc?export=download&confirm=XXX&id=
  const href = html.match(
    /href="(\/uc\?export=download[^"]+)"/i,
  )
  if (href?.[1]) {
    try {
      const u = new URL(href[1].replace(/&amp;/g, '&'), 'https://drive.google.com')
      const confirm = u.searchParams.get('confirm')
      if (confirm) return confirm
      if (u.searchParams.get('id') === fileId) return u.searchParams.get('confirm')
    } catch {
      /* ignore */
    }
  }
  return null
}

async function readBodyLimited(res: Response, maxBytes: number): Promise<Uint8Array> {
  const len = Number(res.headers.get('content-length') || 0)
  if (len > maxBytes) {
    throw new Error(
      `El video pesa demasiado (${(len / (1024 * 1024)).toFixed(1)} MB). El máximo por enlace es ${(maxBytes / (1024 * 1024)).toFixed(0)} MB; súbelo como archivo.`,
    )
  }

  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.byteLength > maxBytes) {
      throw new Error(
        `El video supera el máximo de ${(maxBytes / (1024 * 1024)).toFixed(0)} MB por enlace.`,
      )
    }
    return buf
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      try {
        await reader.cancel()
      } catch {
        /* ignore */
      }
      throw new Error(
        `El video supera el máximo de ${(maxBytes / (1024 * 1024)).toFixed(0)} MB por enlace; súbelo como archivo.`,
      )
    }
    chunks.push(value)
  }

  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

async function fetchOnce(url: string): Promise<Response> {
  assertPublicHttpUrl(url)
  return fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; Fotogif/1.0; +https://github.com/Jhon-Fuenwhv2024/EditorGIF)',
      Accept: 'video/*,application/octet-stream,*/*',
    },
  })
}

/**
 * Descarga un video remoto (Drive / Dropbox / URL directa).
 * Pensado para ejecutarse en servidor (Netlify Function o middleware Vite).
 */
export async function downloadRemoteVideo(rawUrl: string): Promise<DownloadedVideo> {
  const resolved = resolveSourceUrl(rawUrl)
  assertPublicHttpUrl(resolved.url)

  let res = await fetchOnce(resolved.url)
  if (!res.ok && res.status !== 303 && res.status !== 302) {
    throw new Error(`No se pudo descargar el video (HTTP ${res.status}). ¿El enlace es público?`)
  }

  let bytes = await readBodyLimited(res, MAX_BYTES)
  let contentType = res.headers.get('content-type') || ''
  let filename = filenameFromHeaders(res.headers.get('content-disposition'), resolved.url)

  // Google Drive: a veces responde HTML con confirmación antivirus
  if (resolved.kind === 'google-drive' && (contentType.includes('text/html') || looksLikeHtml(bytes))) {
    const html = new TextDecoder().decode(bytes)
    const driveId = extractGoogleDriveId(rawUrl) || extractGoogleDriveId(resolved.url)
    if (!driveId) {
      throw new Error('No se pudo leer el ID de Google Drive.')
    }
    const confirm = extractDriveConfirm(html, driveId) || 't'
    const retryUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}&confirm=${encodeURIComponent(confirm)}`
    res = await fetchOnce(retryUrl)
    if (!res.ok) {
      throw new Error(
        `Google Drive rechazó la descarga (HTTP ${res.status}). Comparte el archivo como «Cualquier persona con el enlace».`,
      )
    }
    bytes = await readBodyLimited(res, MAX_BYTES)
    contentType = res.headers.get('content-type') || contentType
    filename = filenameFromHeaders(res.headers.get('content-disposition'), retryUrl) || `drive-${driveId}.mp4`

    if (contentType.includes('text/html') || looksLikeHtml(bytes)) {
      throw new Error(
        'Google Drive devolvió una página en lugar del video. Comprueba que el enlace sea público y que el archivo no sea demasiado grande.',
      )
    }
  }

  if (contentType.includes('text/html') || looksLikeHtml(bytes)) {
    throw new Error('El enlace no apunta a un video descargable.')
  }

  if (bytes.byteLength < 64) {
    throw new Error('La descarga está vacía o incompleta.')
  }

  // Extensión por defecto si falta
  if (!/\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(filename)) {
    filename = `${filename.replace(/\.[^.]+$/, '') || 'video'}.mp4`
  }

  return {
    bytes,
    contentType: guessContentType(filename, contentType),
    filename,
    sourceUrl: resolved.url,
  }
}
