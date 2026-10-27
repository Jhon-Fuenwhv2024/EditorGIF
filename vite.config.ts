import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { downloadRemoteVideo, resolveSourceUrl } from './shared/remote-download.ts'
import { DEFAULT_SITE_URL, normalizeSiteUrl } from './shared/site.ts'

function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(JSON.stringify(data))
}

async function toWebRequest(
  req: Connect.IncomingMessage,
  fullUrl: string,
): Promise<Request> {
  const method = req.method || 'GET'
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
    else headers.set(key, value)
  }
  const init: RequestInit = { method, headers }
  if (method !== 'GET' && method !== 'HEAD') {
    const raw = await readRawBody(req)
    if (raw.byteLength > 0) init.body = raw
  }
  return new Request(fullUrl, init)
}

async function pipeWebResponse(webRes: Response, res: ServerResponse) {
  res.statusCode = webRes.status
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') return
    res.setHeader(key, value)
  })
  const buf = Buffer.from(await webRes.arrayBuffer())
  res.end(buf)
}

async function handleFetchVideo(
  req: Connect.IncomingMessage,
  res: ServerResponse,
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  try {
    let rawUrl = ''
    let maxBytes: number | undefined
    if (req.method === 'GET') {
      const host = req.headers.host || '127.0.0.1'
      const u = new URL(req.url || '/', `http://${host}`)
      rawUrl = u.searchParams.get('url') || ''
      const mb = Number(u.searchParams.get('maxBytes'))
      if (Number.isFinite(mb) && mb > 0) maxBytes = mb
    } else if (req.method === 'POST') {
      const raw = await readRawBody(req)
      const body = JSON.parse(raw.toString('utf8') || '{}') as {
        url?: string
        maxBytes?: number
      }
      rawUrl = body?.url?.trim() || ''
      if (typeof body?.maxBytes === 'number' && body.maxBytes > 0) {
        maxBytes = body.maxBytes
      }
    } else {
      sendJson(res, 405, { error: 'Método no permitido' })
      return
    }

    if (!rawUrl) {
      sendJson(res, 400, { error: 'Falta el parámetro url' })
      return
    }

    resolveSourceUrl(rawUrl)
    const file = await downloadRemoteVideo(rawUrl, maxBytes)
    res.statusCode = 200
    res.setHeader('Content-Type', file.contentType)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename.replace(/"/g, '')}"`,
    )
    res.setHeader('X-Fotogif-Filename', encodeURIComponent(file.filename))
    res.setHeader('Cache-Control', 'no-store')
    res.end(Buffer.from(file.bytes))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al descargar el video'
    sendJson(res, 400, { error: message })
  }
}

const STRIPE_PATHS = {
  '/api/create-checkout-session': () =>
    import('./netlify/functions/create-checkout-session.ts'),
  '/api/create-portal-session': () =>
    import('./netlify/functions/create-portal-session.ts'),
  '/api/pro-status': () => import('./netlify/functions/pro-status.ts'),
  '/api/verify-checkout': () => import('./netlify/functions/verify-checkout.ts'),
  '/api/stripe-webhook': () => import('./netlify/functions/stripe-webhook.ts'),
} as const

function apiPlugin(): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0] || ''
      if (path === '/api/fetch-video') {
        void handleFetchVideo(req, res)
        return
      }
      const loader = STRIPE_PATHS[path as keyof typeof STRIPE_PATHS]
      if (!loader) {
        next()
        return
      }
      void (async () => {
        try {
          const host = req.headers.host || '127.0.0.1'
          const fullUrl = `http://${host}${req.url || path}`
          const webReq = await toWebRequest(req, fullUrl)
          const mod = await loader()
          const webRes = await mod.default(webReq, undefined)
          await pipeWebResponse(webRes, res)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error de API'
          sendJson(res, 500, { error: message })
        }
      })()
    })
  }

  return {
    name: 'fotogif-api',
    configureServer(server) {
      mount(server.middlewares)
    },
    configurePreviewServer(server) {
      mount(server.middlewares)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Expone STRIPE_* al proceso de Node (middleware / functions locales).
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) process.env[key] = value
  }

  // Por defecto producción; override con VITE_SITE_URL en .env / Netlify.
  if (!process.env.VITE_SITE_URL) {
    process.env.VITE_SITE_URL = DEFAULT_SITE_URL
  }
  const site = normalizeSiteUrl(env.VITE_SITE_URL || process.env.VITE_SITE_URL)

  return {
    define: {
      // Asegura que el cliente vea el default si no hay .env
      'import.meta.env.VITE_SITE_URL': JSON.stringify(site),
    },
    plugins: [
      react(),
      tailwindcss(),
      apiPlugin(),
      {
        name: 'fotogif-html-site-url',
        transformIndexHtml(html) {
          return html
            .replaceAll('https://videogif.trainfit.cloud', site)
            .replaceAll('content="/og.png"', `content="${site}/og.png"`)
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'og.png', 'ads.txt', 'robots.txt'],
        workbox: {
          // No precachear el core WASM (~32 MB); se descarga bajo demanda.
          globIgnores: ['**/ffmpeg/**', '**/*.wasm'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: '/index.html',
        },
        manifest: {
          name: 'Fotogif — Video a GIF',
          short_name: 'Fotogif',
          description:
            'Convierte video a GIF en tu navegador: recorta, ajusta y descarga.',
          theme_color: '#0c1f1c',
          background_color: '#f3ebe0',
          display: 'standalone',
          lang: 'es',
          start_url: '/app',
          id: '/app',
          icons: [
            {
              src: '/pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    server: {
      host: '127.0.0.1',
      port: 4521,
      headers: {
        // credentialless: permite AdSense/Stripe sin exigir CORP; ffmpeg single-thread no necesita COEP estricto.
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    },
    preview: {
      host: '127.0.0.1',
      port: 4521,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
  }
})
