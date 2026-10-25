import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/@ffmpeg/core/dist/esm')
const dest = join(root, 'public/ffmpeg')

if (!existsSync(join(src, 'ffmpeg-core.wasm'))) {
  console.warn('[copy-ffmpeg] @ffmpeg/core no instalado; se omite la copia')
  process.exit(0)
}

mkdirSync(dest, { recursive: true })
copyFileSync(join(src, 'ffmpeg-core.js'), join(dest, 'ffmpeg-core.js'))
copyFileSync(join(src, 'ffmpeg-core.wasm'), join(dest, 'ffmpeg-core.wasm'))
console.log('[copy-ffmpeg] Core single-thread copiado a public/ffmpeg/')
