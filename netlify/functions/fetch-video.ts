import type { Config, Context } from '@netlify/functions'
import {
  downloadRemoteVideo,
  MAX_BYTES,
  resolveSourceUrl,
} from '../../shared/remote-download'

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405)
  }

  try {
    let rawUrl = ''
    let maxBytes = MAX_BYTES
    if (req.method === 'GET') {
      const u = new URL(req.url)
      rawUrl = u.searchParams.get('url') || ''
      const mb = Number(u.searchParams.get('maxBytes'))
      if (Number.isFinite(mb) && mb > 0) maxBytes = mb
    } else {
      const body = (await req.json().catch(() => null)) as {
        url?: string
        maxBytes?: number
      } | null
      rawUrl = body?.url?.trim() || ''
      if (typeof body?.maxBytes === 'number' && body.maxBytes > 0) {
        maxBytes = body.maxBytes
      }
    }

    if (!rawUrl) {
      return json({ error: 'Falta el parámetro url' }, 400)
    }

    // Validación temprana para mensajes claros
    resolveSourceUrl(rawUrl)

    const file = await downloadRemoteVideo(rawUrl, maxBytes)
    return new Response(file.bytes, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${sanitizeFilename(file.filename)}"`,
        'Cache-Control': 'no-store',
        'X-Fotogif-Filename': encodeURIComponent(file.filename),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al descargar el video'
    return json({ error: message }, 400)
  }
}

export const config: Config = {
  path: '/api/fetch-video',
  method: ['GET', 'POST', 'OPTIONS'],
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-()\s\u00C0-\u024F]/g, '_').slice(0, 120)
}
