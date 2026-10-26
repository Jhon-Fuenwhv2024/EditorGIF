import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin } from 'vite'
import { defineConfig } from 'vite'
import { downloadRemoteVideo, resolveSourceUrl } from './shared/remote-download.ts'

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(null)
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(JSON.stringify(data))
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
    if (req.method === 'GET') {
      const host = req.headers.host || '127.0.0.1'
      const u = new URL(req.url || '/', `http://${host}`)
      rawUrl = u.searchParams.get('url') || ''
    } else if (req.method === 'POST') {
      const body = (await readJsonBody(req)) as { url?: string } | null
      rawUrl = body?.url?.trim() || ''
    } else {
      sendJson(res, 405, { error: 'Método no permitido' })
      return
    }

    if (!rawUrl) {
      sendJson(res, 400, { error: 'Falta el parámetro url' })
      return
    }

    resolveSourceUrl(rawUrl)
    const file = await downloadRemoteVideo(rawUrl)
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

function fetchVideoApiPlugin(): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0]
      if (path !== '/api/fetch-video') {
        next()
        return
      }
      void handleFetchVideo(req, res)
    })
  }

  return {
    name: 'fotogif-fetch-video-api',
    configureServer(server) {
      mount(server.middlewares)
    },
    configurePreviewServer(server) {
      mount(server.middlewares)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), fetchVideoApiPlugin()],
  server: {
    host: '127.0.0.1',
    port: 4521,
    headers: {
      // SharedArrayBuffer / multi-thread; harmless with single-thread core
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4521,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})
