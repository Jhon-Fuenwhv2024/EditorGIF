import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import {
  handleCreateCheckout,
  handleCreatePortal,
  handleFetchVideo,
  handleProStatus,
  handleStripeWebhook,
  handleVerifyCheckout,
} from './shared/api-handlers.ts'
import { envFromProcess } from './shared/stripe-server.ts'
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
    if (raw.byteLength > 0) init.body = new Uint8Array(raw)
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

const API_HANDLERS: Record<
  string,
  (req: Request) => Promise<Response>
> = {
  '/api/fetch-video': (req) => handleFetchVideo(req),
  '/api/create-checkout-session': (req) =>
    handleCreateCheckout(req, envFromProcess()),
  '/api/create-portal-session': (req) =>
    handleCreatePortal(req, envFromProcess()),
  '/api/pro-status': (req) => handleProStatus(req, envFromProcess()),
  '/api/verify-checkout': (req) => handleVerifyCheckout(req, envFromProcess()),
  '/api/stripe-webhook': (req) => handleStripeWebhook(req, envFromProcess()),
}

function apiPlugin(): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0] || ''
      const handler = API_HANDLERS[path]
      if (!handler) {
        next()
        return
      }
      void (async () => {
        try {
          const host = req.headers.host || '127.0.0.1'
          const fullUrl = `http://${host}${req.url || path}`
          const webReq = await toWebRequest(req, fullUrl)
          const webRes = await handler(webReq)
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) process.env[key] = value
  }

  if (!process.env.VITE_SITE_URL) {
    process.env.VITE_SITE_URL = DEFAULT_SITE_URL
  }
  const site = normalizeSiteUrl(env.VITE_SITE_URL || process.env.VITE_SITE_URL)

  return {
    define: {
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
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
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
